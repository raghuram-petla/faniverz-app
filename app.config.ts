import { ExpoConfig, ConfigContext } from 'expo/config';
import { withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * @contract APP_VARIANT env var controls bundle ID and app name.
 *   'development' → com.faniverz.app.dev     / "Faniverz Dev"
 *   'preview'     → com.faniverz.app.preview / "Faniverz Preview"
 *   undefined     → com.faniverz.app         / "Faniverz"
 * All three variants install as separate apps on the same device.
 */
const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getBundleId = () => {
  if (IS_DEV) return 'com.faniverz.app.dev';
  if (IS_PREVIEW) return 'com.faniverz.app.preview';
  return 'com.faniverz.app';
};
const getAppName = () => {
  if (IS_DEV) return 'Faniverz Dev';
  if (IS_PREVIEW) return 'Faniverz Preview';
  return 'Faniverz';
};
const getScheme = () => {
  if (IS_DEV) return 'faniverz-dev';
  if (IS_PREVIEW) return 'faniverz-preview';
  return 'faniverz';
};

// @contract Reversed iOS client ID is required as a URL scheme for Google Sign-In OAuth redirect.
// Format: take the iOS client ID and reverse the dot-separated components.
const getGoogleIosClientId = () => {
  if (IS_DEV) return '753020744218-dbjabcv09h78k63rrerksv43m3uegto5.apps.googleusercontent.com';
  if (IS_PREVIEW) return '753020744218-5u586ggfsbshueasdc75m2sbsq9p61rs.apps.googleusercontent.com';
  return '753020744218-7e8g8ljptunu5shfpct2siekdm93j2eh.apps.googleusercontent.com';
};

// @contract Reversed iOS client ID is required as a URL scheme for Google Sign-In OAuth redirect.
const getGoogleIosUrlScheme = () => {
  const clientId = getGoogleIosClientId();
  const parts = clientId.split('.').reverse();
  return parts.join('.');
};

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
    owner: 'faniverz',
    version: '1.0.0',
    orientation: 'portrait',
    icon: IS_DEV
      ? './assets/icon-dev-light.png'
      : IS_PREVIEW
        ? './assets/icon-preview-light.png'
        : './assets/icon-light.png',
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
        : IS_PREVIEW
          ? {
              light: './assets/icon-preview-light.png',
              dark: './assets/icon-preview-dark.png',
              tinted: './assets/icon-preview-tinted.png',
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
      ['@react-native-google-signin/google-signin', { iosUrlScheme: getGoogleIosUrlScheme() }],
      'expo-apple-authentication',
    ],
    extra: {
      router: {},
      googleIosClientId: getGoogleIosClientId(),
      eas: {
        projectId: '40b03e0e-9fe5-4eda-9848-4af9a0458e73',
      },
    },
  } as ExpoConfig);
