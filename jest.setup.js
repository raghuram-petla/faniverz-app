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
jest.mock('react-native-reanimated', () => ({
  default: {
    call: jest.fn(),
    createAnimatedComponent: (component) => component,
    addWhitelistedNativeProps: jest.fn(),
    addWhitelistedUIProps: jest.fn(),
  },
  useSharedValue: jest.fn(() => ({ value: 0 })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((value) => value),
  withSpring: jest.fn((value) => value),
  withSequence: jest.fn((...values) => values[values.length - 1]),
  withDelay: jest.fn((_, animation) => animation),
  FadeIn: { duration: jest.fn(() => ({ delay: jest.fn() })) },
  FadeInDown: { duration: jest.fn(() => ({ delay: jest.fn() })) },
  FadeOut: { duration: jest.fn() },
  SlideInRight: { duration: jest.fn() },
  SlideOutLeft: { duration: jest.fn() },
  Layout: { duration: jest.fn() },
  Easing: { bezier: jest.fn() },
  runOnJS: jest.fn((fn) => fn),
  interpolate: jest.fn(),
}));

// Mock expo-google-fonts (fonts always "loaded" in tests)
jest.mock('@expo-google-fonts/exo-2', () => ({
  useFonts: jest.fn(() => [true]),
  Exo2_800ExtraBold_Italic: 'Exo2_800ExtraBold_Italic',
}));
