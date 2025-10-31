const { withInfoPlist, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to enable RTL support for both iOS and Android
 */
const withRTLSupport = (config) => {
  // Android configuration
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Find the <application> tag
    const application = androidManifest.manifest.application[0];

    if (application) {
      // Enable RTL support at the application level
      application.$['android:supportsRtl'] = 'true';

      console.log('✅ RTL support added to AndroidManifest.xml');
    }

    return config;
  });

  // iOS configuration
  config = withInfoPlist(config, async (config) => {
    // Set the CFBundleDevelopmentRegion to Arabic
    // This helps iOS understand the app's primary language direction
    config.modResults.CFBundleDevelopmentRegion = 'ar';

    // Add Arabic to the list of localizations
    if (!config.modResults.CFBundleLocalizations) {
      config.modResults.CFBundleLocalizations = [];
    }
    if (!config.modResults.CFBundleLocalizations.includes('ar')) {
      config.modResults.CFBundleLocalizations.push('ar');
    }

    console.log('✅ RTL support added to Info.plist (iOS)');

    return config;
  });

  return config;
};

module.exports = withRTLSupport;

