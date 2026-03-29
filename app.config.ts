import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * @contract APP_VARIANT env var controls bundle ID and app name.
 *   'development' → com.faniverz.app.dev / "Faniverz Dev"
 *   undefined     → com.faniverz.app     / "Faniverz"
 */
const IS_DEV = process.env.APP_VARIANT === 'development';

const getBundleId = () => (IS_DEV ? 'com.faniverz.app.dev' : 'com.faniverz.app');
const getAppName = () => (IS_DEV ? 'Faniverz Dev' : 'Faniverz');
const getScheme = () => (IS_DEV ? 'faniverz-dev' : 'faniverz');

export default ({ config }: ConfigContext): ExpoConfig => ({
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
    // @sideeffect motionPermission:false strips NSMotionUsageDescription from Info.plist.
    // Raw accelerometer (CMMotionManager) doesn't need it — only step/activity tracking does.
    // Without this, users see a scary "Motion & Fitness" prompt for a movie app.
    ['expo-sensors', { motionPermission: false }],
    '@react-native-google-signin/google-signin',
  ],
  extra: {
    router: {},
    eas: {
      projectId: '40b03e0e-9fe5-4eda-9848-4af9a0458e73',
    },
  },
});
