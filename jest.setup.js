// Suppress noisy console output during tests (expected errors from error-path tests).
// Set VERBOSE_TESTS=1 to see all console output when debugging:
//   VERBOSE_TESTS=1 npx jest ...
// Uses direct replacement (not jest.spyOn) so it survives jest.restoreAllMocks().
if (!process.env.VERBOSE_TESTS) {
  const noop = () => {};
  console.error = noop;
  console.warn = noop;
}

// Set required env vars for supabase client initialization
process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// Mock react-i18next — load actual English translations so tests can assert on English text
jest.mock('react-i18next', () => {
  const en = require('./src/i18n/en.json');
  const flatten = (obj, prefix = '') =>
    Object.keys(obj).reduce((acc, key) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(acc, flatten(obj[key], fullKey));
      } else {
        acc[fullKey] = obj[key];
      }
      return acc;
    }, {});
  const translations = flatten(en);
  return {
    useTranslation: () => ({
      t: (key, params) => {
        let str = translations[key] || key;
        if (params && typeof params === 'object') {
          Object.entries(params).forEach(([k, v]) => {
            str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
          });
        }
        return str;
      },
      i18n: { language: 'en', changeLanguage: jest.fn() },
    }),
    Trans: ({ children }) => children,
  };
});

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithIdToken: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
  },
  __esModule: true,
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: View,
    MaterialIcons: View,
    MaterialCommunityIcons: View,
    FontAwesome: View,
    Feather: View,
  };
});

// Mock expo-image
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: View,
  };
});

// Mock @shopify/flash-list
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View, ScrollView, Text } = require('react-native');
  const React = require('react');
  const AnimatedView = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref }),
  );
  const AnimatedScrollView = React.forwardRef((props, ref) =>
    React.createElement(ScrollView, { ...props, ref }),
  );
  const AnimatedText = React.forwardRef((props, ref) =>
    React.createElement(Text, { ...props, ref }),
  );
  return {
    __esModule: true,
    default: {
      call: jest.fn(),
      createAnimatedComponent: (component) => component,
      addWhitelistedNativeProps: jest.fn(),
      addWhitelistedUIProps: jest.fn(),
      View: AnimatedView,
      ScrollView: AnimatedScrollView,
      Text: AnimatedText,
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    measure: jest.fn(() => ({ x: 0, y: 0, width: 200, height: 255, pageX: 16, pageY: 200 })),
    withTiming: jest.fn((value, _config, callback) => {
      if (callback) callback(true);
      return value;
    }),
    withSpring: jest.fn((value, _config, callback) => {
      if (callback) callback(true);
      return value;
    }),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withDelay: jest.fn((_, animation) => animation),
    withDecay: jest.fn(() => 0),
    withRepeat: jest.fn((animation) => animation),
    FadeIn: { duration: jest.fn(() => ({ delay: jest.fn() })) },
    FadeInDown: { duration: jest.fn(() => ({ delay: jest.fn() })) },
    FadeOut: { duration: jest.fn() },
    SlideInRight: { duration: jest.fn() },
    SlideOutLeft: { duration: jest.fn() },
    Layout: { duration: jest.fn(), springify: jest.fn(() => ({})) },
    Easing: {
      bezier: jest.fn(() => (t) => t),
      bezierFn: jest.fn(() => (t) => t),
      inOut: jest.fn((fn) => fn),
      out: jest.fn((fn) => fn),
      ease: (t) => t,
    },
    runOnJS: jest.fn((fn) => fn),
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
    interpolate: jest.fn(),
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  };
});

// Mock expo-google-fonts (fonts always "loaded" in tests)
jest.mock('@expo-google-fonts/exo-2', () => ({
  useFonts: jest.fn(() => [true]),
  Exo2_800ExtraBold_Italic: 'Exo2_800ExtraBold_Italic',
}));

// Mock useScrollToTop from React Navigation (requires navigation context)
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useScrollToTop: jest.fn(),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock useAnimationsEnabled — animations ON by default in tests
jest.mock('@/hooks/useAnimationsEnabled', () => ({
  useAnimationsEnabled: () => true,
}));

// Mock theme context — always dark in tests
jest.mock('@/theme/ThemeContext', () => {
  const { colors } = require('@shared/colors');
  const { darkTheme } = require('@shared/themes');
  return {
    ThemeProvider: ({ children }) => children,
    useTheme: () => ({
      theme: darkTheme,
      colors,
      isDark: true,
      mode: 'system',
      setMode: jest.fn(),
    }),
  };
});
