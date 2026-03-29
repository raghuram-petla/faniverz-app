import { renderHook, act } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSnapScroll } from '../useSnapScroll';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    default: { ScrollView: 'Animated.ScrollView' },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
  };
});

const SNAP_THRESHOLD = 200;

function createScrollEvent(y: number, vy?: number) {
  return {
    nativeEvent: {
      contentOffset: { y },
      velocity: vy !== undefined ? { y: vy } : undefined,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function createLayoutEvent(height: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { nativeEvent: { layout: { height } } } as any;
}

describe('useSnapScroll', () => {
  it('returns all expected handlers and scrollRef', () => {
    const scrollOffset = { value: 0 };
    const { result } = renderHook(() =>
      useSnapScroll({
        scrollOffset: scrollOffset as ReturnType<typeof useSharedValue<number>>,
        snapThreshold: SNAP_THRESHOLD,
      }),
    );

    expect(result.current.scrollRef).toBeDefined();
    expect(typeof result.current.handleScroll).toBe('function');
    expect(typeof result.current.handleScrollEndDrag).toBe('function');
    expect(typeof result.current.handleMomentumEnd).toBe('function');
    expect(typeof result.current.handleLayout).toBe('function');
    expect(result.current.contentMinHeight).toBe(SNAP_THRESHOLD); // 0 + threshold before layout
  });

  it('updates scrollOffset on scroll', () => {
    const scrollOffset = { value: 0 };
    const { result } = renderHook(() =>
      useSnapScroll({
        scrollOffset: scrollOffset as ReturnType<typeof useSharedValue<number>>,
        snapThreshold: SNAP_THRESHOLD,
      }),
    );

    act(() => {
      result.current.handleScroll(createScrollEvent(75));
    });
    expect(scrollOffset.value).toBe(75);
  });

  it('computes contentMinHeight as viewport + threshold', () => {
    const scrollOffset = { value: 0 };
    const { result } = renderHook(() =>
      useSnapScroll({
        scrollOffset: scrollOffset as ReturnType<typeof useSharedValue<number>>,
        snapThreshold: SNAP_THRESHOLD,
      }),
    );

    act(() => {
      result.current.handleLayout(createLayoutEvent(800));
    });
    expect(result.current.contentMinHeight).toBe(1000); // 800 + 200
  });

  it('does not crash on scroll end drag with no velocity', () => {
    const scrollOffset = { value: 0 };
    const { result } = renderHook(() =>
      useSnapScroll({
        scrollOffset: scrollOffset as ReturnType<typeof useSharedValue<number>>,
        snapThreshold: SNAP_THRESHOLD,
      }),
    );

    expect(() => {
      act(() => {
        result.current.handleScrollEndDrag(createScrollEvent(50, 0));
      });
    }).not.toThrow();
  });

  it('does not crash on momentum end', () => {
    const scrollOffset = { value: 0 };
    const { result } = renderHook(() =>
      useSnapScroll({
        scrollOffset: scrollOffset as ReturnType<typeof useSharedValue<number>>,
        snapThreshold: SNAP_THRESHOLD,
      }),
    );

    expect(() => {
      act(() => {
        result.current.handleMomentumEnd(createScrollEvent(100));
      });
    }).not.toThrow();
  });

  it('does not snap when scroll offset is beyond threshold', () => {
    const scrollOffset = { value: 0 };
    const { result } = renderHook(() =>
      useSnapScroll({
        scrollOffset: scrollOffset as ReturnType<typeof useSharedValue<number>>,
        snapThreshold: SNAP_THRESHOLD,
      }),
    );

    const mockScrollTo = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.current.scrollRef as any).current = { scrollTo: mockScrollTo };

    act(() => {
      result.current.handleMomentumEnd(createScrollEvent(250));
    });
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('snaps to threshold when past midpoint', () => {
    const scrollOffset = { value: 0 };
    const { result } = renderHook(() =>
      useSnapScroll({
        scrollOffset: scrollOffset as ReturnType<typeof useSharedValue<number>>,
        snapThreshold: SNAP_THRESHOLD,
      }),
    );

    const mockScrollTo = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.current.scrollRef as any).current = { scrollTo: mockScrollTo };

    act(() => {
      result.current.handleMomentumEnd(createScrollEvent(150));
    });
    expect(mockScrollTo).toHaveBeenCalledWith({ y: SNAP_THRESHOLD, animated: true });
  });

  it('snaps to 0 when below midpoint', () => {
    const scrollOffset = { value: 0 };
    const { result } = renderHook(() =>
      useSnapScroll({
        scrollOffset: scrollOffset as ReturnType<typeof useSharedValue<number>>,
        snapThreshold: SNAP_THRESHOLD,
      }),
    );

    const mockScrollTo = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.current.scrollRef as any).current = { scrollTo: mockScrollTo };

    act(() => {
      result.current.handleMomentumEnd(createScrollEvent(80));
    });
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('skips snap when velocity is high on scroll end drag', () => {
    const scrollOffset = { value: 0 };
    const { result } = renderHook(() =>
      useSnapScroll({
        scrollOffset: scrollOffset as ReturnType<typeof useSharedValue<number>>,
        snapThreshold: SNAP_THRESHOLD,
      }),
    );

    const mockScrollTo = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.current.scrollRef as any).current = { scrollTo: mockScrollTo };

    // High velocity means momentum will follow — don't snap yet
    act(() => {
      result.current.handleScrollEndDrag(createScrollEvent(50, 2.0));
    });
    expect(mockScrollTo).not.toHaveBeenCalled();
  });
});
