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
