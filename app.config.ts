import { ExpoConfig, ConfigContext } from 'expo/config';
import { withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * @contract APP_VARIANT env var controls bundle ID and app name.
 *   'development' → com.faniverz.app.dev / "Faniverz Dev"
 *   undefined     → com.faniverz.app     / "Faniverz"
 */
const IS_DEV = process.env.APP_VARIANT === 'development';

const getBundleId = () => (IS_DEV ? 'com.faniverz.app.dev' : 'com.faniverz.app');
const getAppName = () => (IS_DEV ? 'Faniverz Dev' : 'Faniverz');
const getScheme = () => (IS_DEV ? 'faniverz-dev' : 'faniverz');

// @boundary Xcode 26+ added allowable-clients restriction on SwiftUICore.
// expo prebuild regenerates /ios/ (gitignored), so the fix must live here as a
// config plugin — manually editing ios/Podfile is wiped on every EAS build.
// @sideeffect Patches the generated Podfile during expo prebuild.
const withSwiftUICoreWeakLink = (config: ExpoConfig): ExpoConfig =>
  withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, 'Podfile');
      let src = fs.readFileSync(podfilePath, 'utf-8');
      const marker = '# weak-link-swiftuicore';
      if (!src.includes(marker)) {
        // Build the Ruby snippet as an array to avoid JS template-literal conflicts
        // with Ruby's #{} interpolation syntax.
        const rubyInterp = '#{existing_str}';
        const patch = [
          '',
          '',
          `    ${marker}`,
          '    installer.pods_project.targets.each do |target|',
          '      target.build_configurations.each do |bc|',
          "        existing = bc.build_settings['OTHER_LDFLAGS'] || '$(inherited)'",
          "        existing_str = existing.is_a?(Array) ? existing.join(' ') : existing.to_s",
          "        unless existing_str.include?('-weak_framework SwiftUICore')",
          `          bc.build_settings['OTHER_LDFLAGS'] = "${rubyInterp} -weak_framework SwiftUICore"`,
          '        end',
          '      end',
          '    end',
        ].join('\n');
        src = src.replace(/(react_native_post_install\([\s\S]*?\n\s*\))/, (match) => match + patch);
        fs.writeFileSync(podfilePath, src);
      }
      return modConfig;
    },
  ]);

export default ({ config }: ConfigContext): ExpoConfig =>
  withSwiftUICoreWeakLink({
    ...config,
    name: getAppName(),
    slug: 'faniverz',
    version: '1.0.0',
    orientation: 'portrait',
    icon: IS_DEV ? './assets/icon-dev-light.png' : './assets/icon-light.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    scheme: getScheme(),
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: getBundleId(),
      icon: IS_DEV
        ? {
            light: './assets/icon-dev-light.png',
            dark: './assets/icon-dev-dark.png',
            tinted: './assets/icon-dev-tinted.png',
          }
        : {
            light: './assets/icon-light.png',
            dark: './assets/icon-dark.png',
            tinted: './assets/icon-tinted.png',
          },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      edgeToEdgeEnabled: true,
      package: getBundleId(),
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-localization',
      'expo-font',
      'expo-system-ui',
      // @contract expo-sensors intentionally NOT listed here.
      // The plugin's motionPermission:false excludes EXMotionPermissionRequester.m from
      // pod compilation, causing a linker error on Xcode 26 (stricter allowable-clients).
      // Raw Accelerometer (CMMotionManager) never triggers the Motion & Fitness permission
      // dialog — that only fires for CMMotionActivityManager (step counting), which this
      // app does not use. Omitting the plugin keeps EXMotionPermissionRequester compiled
      // and keeps NSMotionUsageDescription out of Info.plist.
      '@react-native-google-signin/google-signin',
    ],
    extra: {
      router: {},
      eas: {
        projectId: '40b03e0e-9fe5-4eda-9848-4af9a0458e73',
      },
    },
  } as ExpoConfig);
