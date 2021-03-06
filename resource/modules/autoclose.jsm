// VERSION 2.0.2

this.autoClose = {
	cancelAutoClose: null,

	handleEvent: function(e) {
		switch(e.type) {
			case 'beginToggleSidebar':
				// stops closing the sidebar when quickly toggling between sidebars in auto-close mode
				if(Timers['autoCloseSidebarToggled'+(e.detail.bar.twin ? 'Twin' : '')]) {
					e.preventDefault();
				}
				break;

			case 'endToggleSidebar':
				var bar = e.detail.bar;
				if(bar.autoClose) {
					Timers.init('autoCloseSidebarToggled'+(bar.twin ? 'Twin' : ''), function() {}, 100);
				}
				break;

			case 'SidebarFocused':
				// this is probably the event from the native SidebarUI that can be fired during startup, it doesn't really matter to us
				if(!e.detail) { return; }

				// we need to focus the sidebar on open or it won't be focused,
				// aSync so it lets it focus itself if it wants to
				aSync(() => {
					var bar = e.detail.bar;

					this.tryFocus(bar);
				});
				break;

			case 'TabSelect':
				Timers.cancel('stopCancelAutoClose');
				this.cancelAutoClose = null;
				// no break;

			case 'focus':
				this.tryClose(e);
				break;

			case 'sidebarAbove':
			case 'sidebarDocked':
			case 'TabOpen':
				Timers.cancel('autoClose');

				if(mainSidebar.focused) {
					this.cancelAutoClose = mainSidebar;
				} else if(twinSidebar.focused) {
					this.cancelAutoClose = twinSidebar;
				}

				if(this.cancelAutoClose) {
					Timers.init('stopCancelAutoClose', () => {
						this.cancelAutoClose = null;
					}, 2000);
				}
				break;
		}
	},

	observe: function(aSubject, aTopic, aData) {
		switch(aTopic) {
			case 'nsPref:changed':
				switch(aSubject) {
					case 'autoClose':
					case 'autoCloseTwin':
						this.init();
						break;
				}
				break;

			case 'quit-application':
				this.dontOpenOnStartup();
				break;
		}
	},

	tryClose: function(e) {
		if(this.cancelAutoClose) {
			this.tryFocus(this.cancelAutoClose);

			Timers.init('stopCancelAutoClose', () => {
				this.cancelAutoClose = null;
			}, 250);
			return;
		}

		Timers.init('autoClose', () => {
			if(this.cancelAutoClose) {
				this.cancelAutoClose = null;
				return;
			}

			try { var focusedNode = document.commandDispatcher.focusedElement || e.target; }
			catch(ex) {
				handleDeadObject(ex);
				return;
			}

			if(!mainSidebar.closed && Prefs.autoClose) {
				if(!isAncestor(focusedNode, mainSidebar.box)
				&& dispatch(mainSidebar.sidebar, { type: 'willCloseSidebar', detail: { bar: mainSidebar, focusedNode: focusedNode } })) {
					Listeners.add(mainSidebar.sidebar, 'closedSidebar', function(e) { e.preventDefault(); }, true, true); // keep current focus
					this.closeHide(mainSidebar);
				}
			}

			if(!twinSidebar.closed && Prefs.autoCloseTwin) {
				if(!isAncestor(focusedNode, twinSidebar.box)
				&& dispatch(twinSidebar.sidebar, { type: 'willCloseSidebar', detail: { bar: twinSidebar, focusedNode: focusedNode } })) {
					Listeners.add(twinSidebar.sidebar, 'closedSidebar', function(e) { e.preventDefault(); }, true, true); // keep current focus
					this.closeHide(twinSidebar);
				}
			}
		}, 100);
	},

	tryFocus: function(bar) {
		if(bar.autoClose && document.commandDispatcher.focusedWindow != bar.sidebar.contentWindow) {
			if(bar.sidebar.contentDocument && bar.sidebar.contentDocument.documentElement) {
				bar.sidebar.contentDocument.documentElement.focus();
			} else {
				bar.sidebar.focus();
			}
		}
	},

	closeHide: function(bar) {
		if(bar.above && bar.autoHide) {
			autoHide.setHover(bar, false);
			setAttribute(bar.box, 'dontReHover', 'true');
		} else {
			SidebarUI.toggle(null, false, bar.twin);
		}
	},

	init: function() {
		if(!Prefs.autoClose && !Prefs.autoCloseTwin) {
			this.deinit();
			return;
		}

		Listeners.add(window, 'beginToggleSidebar', autoClose, true);
		Listeners.add(window, 'endToggleSidebar', autoClose);
		Listeners.add(window, 'SidebarFocused', autoClose);
		Listeners.add(window, 'focus', autoClose, true);
		Listeners.add(window, 'sidebarAbove', autoClose);
		Listeners.add(window, 'sidebarDocked', autoClose);

		// trick to not autoclose when opening tabs in the background sidebar links
		Listeners.add(window, 'TabOpen', autoClose);
		Listeners.add(window, 'TabSelect', autoClose);
	},

	deinit: function() {
		Listeners.remove(window, 'beginToggleSidebar', autoClose, true);
		Listeners.remove(window, 'endToggleSidebar', autoClose);
		Listeners.remove(window, 'SidebarFocused', autoClose);
		Listeners.remove(window, 'focus', autoClose, true);
		Listeners.remove(window, 'sidebarAbove', autoClose);
		Listeners.remove(window, 'sidebarDocked', autoClose);
		Listeners.remove(window, 'TabOpen', autoClose);
		Listeners.remove(window, 'TabSelect', autoClose);
	},

	// we can't have the sidebars open when we restart
	dontOpenOnStartup: function() {
		if(!UNLOADED || UNLOADED == APP_SHUTDOWN) {
			if(Prefs.autoClose && !mainSidebar.closed) { this.closeHide(mainSidebar); }
			if(Prefs.autoCloseTwin && !twinSidebar.closed) { this.closeHide(twinSidebar); }
		}
	}
};

Modules.LOADMODULE = function() {
	Prefs.listen('autoClose', autoClose);
	Prefs.listen('autoCloseTwin', autoClose);

	autoClose.init();

	if(STARTED == APP_STARTUP) {
		autoClose.dontOpenOnStartup();
	}

	Observers.add(autoClose, 'quit-application');
};

Modules.UNLOADMODULE = function() {
	Observers.remove(autoClose, 'quit-application');

	autoClose.deinit();

	Prefs.unlisten('autoClose', autoClose);
	Prefs.unlisten('autoCloseTwin', autoClose);
};
