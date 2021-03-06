// VERSION 1.1.7

Modules.LOADMODULE = function() {
	Modules.load('compatibilityFix/AddonManager');

	AddonManager.getAddonByID("2.0@disconnect.me", function(addon) {
		Modules.loadIf('compatibilityFix/disconnect', (addon && addon.isActive));
	});

	AddonManager.getAddonByID('{77d2ed30-4cd2-11e0-b8af-0800200c9a66}', function(addon) {
		Modules.loadIf('compatibilityFix/FTDeepDark', (addon && addon.isActive));
	});

	Modules.load('compatibilityFix/prefsMonitor');
};

Modules.UNLOADMODULE = function() {
	Modules.unload('compatibilityFix/disconnect');
	Modules.unload('compatibilityFix/FTDeepDark');
	Modules.unload('compatibilityFix/prefsMonitor');
	Modules.unload('compatibilityFix/AddonManager');
};
