const { withEntitlementsPlist, withInfoPlist, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_TARGET = 'OrderWidget';
const WIDGET_BUNDLE_SUFFIX = '.OrderWidget';

function copyWidgetFiles(iosDir) {
  const srcDir = path.join(__dirname, '..', 'targets', WIDGET_TARGET);
  const destDir = path.join(iosDir, WIDGET_TARGET);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
}

function writeWidgetEntitlements(destDir) {
  const p = path.join(destDir, `${WIDGET_TARGET}.entitlements`);
  if (fs.existsSync(p)) return;
  fs.writeFileSync(p, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict></dict></plist>`);
}

function writeWidgetInfoPlist(destDir, bundleId) {
  const p = path.join(destDir, 'Info.plist');
  if (fs.existsSync(p)) return;
  fs.writeFileSync(p, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key><string>OrderWidget</string>
  <key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key><string>${bundleId}</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key><string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`);
}

const withLiveActivity = (config) => {
  // 1. Main app entitlements
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['NSSupportsLiveActivities'] = true;
    return mod;
  });

  // 2. Main app Info.plist
  config = withInfoPlist(config, (mod) => {
    mod.modResults['NSSupportsLiveActivities'] = true;
    return mod;
  });

  // 3. Xcode project — add Widget Extension target
  config = withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const iosDir = mod.modRequest.platformProjectRoot;
    const mainBundleId = config.ios?.bundleIdentifier ?? 'com.lunchdrop.mobile';
    const widgetBundleId = mainBundleId + WIDGET_BUNDLE_SUFFIX;
    const widgetDir = path.join(iosDir, WIDGET_TARGET);

    // Copy Swift source files from targets/OrderWidget/
    copyWidgetFiles(iosDir);
    writeWidgetEntitlements(widgetDir);
    writeWidgetInfoPlist(widgetDir, widgetBundleId);

    const swiftFiles = fs.readdirSync(widgetDir).filter((f) => f.endsWith('.swift'));

    // Add Xcode group for the widget
    const groupKey = project.pbxCreateGroup(WIDGET_TARGET, WIDGET_TARGET);

    // Add source files
    for (const file of swiftFiles) {
      project.addFile(`${WIDGET_TARGET}/${file}`, groupKey, {
        lastKnownFileType: 'sourcecode.swift',
        sourceTree: '"<group>"',
      });
    }

    // Add new extension target
    const target = project.addTarget(
      WIDGET_TARGET,
      'app_extension',
      WIDGET_TARGET,
      widgetBundleId
    );

    // Add Sources build phase
    project.addBuildPhase(
      swiftFiles.map((f) => `${WIDGET_TARGET}/${f}`),
      'PBXSourcesBuildPhase',
      'Sources',
      target.uuid
    );

    // Build settings
    const buildConfigs = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(buildConfigs)) {
      const bc = buildConfigs[key];
      if (bc?.buildSettings?.PRODUCT_NAME === `"${WIDGET_TARGET}"`) {
        Object.assign(bc.buildSettings, {
          SWIFT_VERSION: '5.0',
          IPHONEOS_DEPLOYMENT_TARGET: '16.2',
          TARGETED_DEVICE_FAMILY: '"1"',
          SKIP_INSTALL: 'YES',
          CODE_SIGN_ENTITLEMENTS: `${WIDGET_TARGET}/${WIDGET_TARGET}.entitlements`,
          INFOPLIST_FILE: `${WIDGET_TARGET}/Info.plist`,
        });
      }
    }

    return mod;
  });

  return config;
};

module.exports = withLiveActivity;
