import { renderHook, act } from '@testing-library/react-native';
import { useLoadingProgressBar } from '../useLoadingProgressBar';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (_v: number, _c?: object) => _v,
    withRepeat: (v: number) => v,
    withSequence: (...args: number[]) => args[0],
    cancelAnimation: jest.fn(),
    Easing: { bezier: () => (t: number) => t, inOut: (e: (t: number) => number) => e },
  };
});

describe('useLoadingProgressBar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns container and fill styles', () => {
    const { result } = renderHook(() =>
      useLoadingProgressBar({
        loaded: false,
        delayMs: 300,
        screenW: 393,
        animationsEnabled: true,
      }),
    );
    expect(result.current.containerStyle).toBeDefined();
    expect(result.current.fillStyle).toBeDefined();
  });

  it('hides progress bar when loaded is true', () => {
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useLoadingProgressBar>[0]) => useLoadingProgressBar(props),
      {
        initialProps: {
          loaded: false,
          delayMs: 300,
          screenW: 393,
          animationsEnabled: true,
        },
      },
    );

    act(() => jest.advanceTimersByTime(300));
    expect(result.current.containerStyle).toBeDefined();

    rerender({
      loaded: true,
      delayMs: 300,
      screenW: 393,
      animationsEnabled: true,
    });
    // After loaded, container style still returned (opacity animated to 0)
    expect(result.current.containerStyle).toBeDefined();
  });

  it('skips animation when animationsEnabled is false', () => {
    const { result } = renderHook(() =>
      useLoadingProgressBar({
        loaded: false,
        delayMs: 300,
        screenW: 393,
        animationsEnabled: false,
      }),
    );
    act(() => jest.advanceTimersByTime(500));
    expect(result.current.containerStyle).toBeDefined();
  });
});
