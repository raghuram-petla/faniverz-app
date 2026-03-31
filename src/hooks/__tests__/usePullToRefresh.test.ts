import { renderHook, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { usePullToRefresh, PULL_THRESHOLD } from '../usePullToRefresh';
import type { NativeScrollEvent, NativeSyntheticEvent, GestureResponderEvent } from 'react-native';

const makeScrollEvent = (y: number): NativeSyntheticEvent<NativeScrollEvent> =>
  ({
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 400, height: 2000 },
      layoutMeasurement: { width: 400, height: 800 },
    },
  }) as NativeSyntheticEvent<NativeScrollEvent>;

const makeTouchEvent = (pageY: number): GestureResponderEvent =>
  ({ nativeEvent: { pageY } }) as GestureResponderEvent;

describe('usePullToRefresh', () => {
  it('exports PULL_THRESHOLD constant', () => {
    expect(PULL_THRESHOLD).toBe(70);
  });

  it('returns expected shape', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));
    expect(result.current.pullDistance).toHaveProperty('value');
    expect(result.current.isRefreshing).toHaveProperty('value');
    expect(typeof result.current.showRefreshIndicator).toBe('function');
    expect(typeof result.current.hideRefreshIndicator).toBe('function');
    expect(typeof result.current.handleScrollBeginDrag).toBe('function');
    expect(typeof result.current.handlePullScroll).toBe('function');
    expect(typeof result.current.handleScrollEndDrag).toBe('function');
    expect(result.current.androidPullProps).toBeDefined();
  });

  it('keeps the spinner visible when a screen forces a programmatic refresh indicator', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.showRefreshIndicator();
    });
    expect(result.current.isRefreshing.value).toBe(true);

    act(() => {
      result.current.hideRefreshIndicator();
    });
    expect(result.current.isRefreshing.value).toBe(false);
    expect(result.current.pullDistance.value).toBe(0);
  });

  it('handlePullScroll tracks negative contentOffset as positive pullDistance when dragging', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handleScrollBeginDrag();
      result.current.handlePullScroll(makeScrollEvent(-50));
    });
    expect(result.current.pullDistance.value).toBe(50);
  });

  it('handlePullScroll ignores scroll events when not dragging (bounce-back)', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handlePullScroll(makeScrollEvent(-30));
    });
    expect(result.current.pullDistance.value).toBe(0);
  });

  it('handlePullScroll clamps positive offsets to 0', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handleScrollBeginDrag();
      result.current.handlePullScroll(makeScrollEvent(100));
    });
    expect(result.current.pullDistance.value).toBe(0);
  });

  it('handleScrollEndDrag triggers onRefresh when past threshold', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handleScrollBeginDrag();
      result.current.handleScrollEndDrag(makeScrollEvent(-(PULL_THRESHOLD + 1)));
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isRefreshing.value).toBe(true);
  });

  it('handleScrollEndDrag resets pullDistance when below threshold', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handleScrollBeginDrag();
      result.current.handlePullScroll(makeScrollEvent(-30));
    });
    expect(result.current.pullDistance.value).toBe(30);

    act(() => {
      result.current.handleScrollEndDrag(makeScrollEvent(-30));
    });
    expect(result.current.pullDistance.value).toBe(0);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('handleScrollEndDrag does NOT trigger when already refreshing', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, true));

    act(() => {
      result.current.handleScrollBeginDrag();
      result.current.handleScrollEndDrag(makeScrollEvent(-(PULL_THRESHOLD + 1)));
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('resets pullDistance to 0 when refreshing becomes false', () => {
    const onRefresh = jest.fn();
    const { result, rerender } = renderHook(
      ({ refreshing }: { refreshing: boolean }) => usePullToRefresh(onRefresh, refreshing),
      { initialProps: { refreshing: true } },
    );

    act(() => {
      result.current.handleScrollBeginDrag();
      result.current.handlePullScroll(makeScrollEvent(-80));
    });
    expect(result.current.pullDistance.value).toBe(80);

    rerender({ refreshing: false });
    expect(result.current.pullDistance.value).toBe(0);
  });

  it('syncs isRefreshing shared value with refreshing prop', () => {
    const onRefresh = jest.fn();
    const { result, rerender } = renderHook(
      ({ refreshing }: { refreshing: boolean }) => usePullToRefresh(onRefresh, refreshing),
      { initialProps: { refreshing: false } },
    );

    expect(result.current.isRefreshing.value).toBe(false);
    rerender({ refreshing: true });
    expect(result.current.isRefreshing.value).toBe(true);
    rerender({ refreshing: false });
    expect(result.current.isRefreshing.value).toBe(false);
  });

  it('returns undefined refreshControl on all platforms', () => {
    const { result } = renderHook(() => usePullToRefresh(jest.fn(), false));
    expect(result.current.refreshControl).toBeUndefined();
  });

  it('returns empty androidPullProps on iOS', () => {
    const { result } = renderHook(() => usePullToRefresh(jest.fn(), false));
    expect(result.current.androidPullProps).toEqual({});
    expect(result.current.renderScrollComponent).toBeUndefined();
  });
});

describe('usePullToRefresh — Android platform', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    (Platform as unknown as { OS: string }).OS = 'android';
  });

  afterEach(() => {
    (Platform as unknown as { OS: string }).OS = originalOS;
  });

  it('handlePullScroll tracks scrollOffsetY but not pullDistance on Android', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handleScrollBeginDrag();
      result.current.handlePullScroll(makeScrollEvent(-80));
    });
    // Android: handlePullScroll only stores scroll offset, doesn't set pullDistance
    expect(result.current.pullDistance.value).toBe(0);
  });

  it('handleScrollEndDrag does not trigger onRefresh on Android', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handleScrollBeginDrag();
      result.current.handleScrollEndDrag(makeScrollEvent(-(PULL_THRESHOLD + 1)));
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('returns androidPullProps with touch handlers on Android', () => {
    const { result } = renderHook(() => usePullToRefresh(jest.fn(), false));
    expect(result.current.renderScrollComponent).toBeDefined();
    expect(result.current.androidPullProps.onTouchStart).toBeDefined();
    expect(result.current.androidPullProps.onTouchMove).toBeDefined();
    expect(result.current.androidPullProps.onTouchEnd).toBeDefined();
    expect(result.current.androidPullProps.onTouchCancel).toBeDefined();
    expect(result.current.androidPullProps.onTouchStartCapture).toBeDefined();
    expect(result.current.androidPullProps.onTouchMoveCapture).toBeDefined();
    expect(result.current.androidPullProps.onTouchEndCapture).toBeDefined();
    expect(result.current.androidPullProps.onTouchCancelCapture).toBeDefined();
  });

  it('touch handlers track pull distance when at top of scroll', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    // Scroll to top (offset 0)
    act(() => {
      result.current.handlePullScroll(makeScrollEvent(0));
    });

    // Start touch and pull down
    act(() => {
      result.current.androidPullProps.onTouchStart!(makeTouchEvent(100));
      result.current.androidPullProps.onTouchMove!(makeTouchEvent(200));
    });
    // 100px delta * 0.5 dampening = 50
    expect(result.current.pullDistance.value).toBe(50);
  });

  it('touch handlers trigger refresh when pull exceeds threshold', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handlePullScroll(makeScrollEvent(0));
    });
    act(() => {
      result.current.androidPullProps.onTouchStart!(makeTouchEvent(100));
      result.current.androidPullProps.onTouchMove!(makeTouchEvent(300)); // 200 * 0.5 = 100 > 70
    });
    act(() => {
      result.current.androidPullProps.onTouchEnd!();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isRefreshing.value).toBe(true);
  });

  it('touch handlers reset pull when below threshold on release', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handlePullScroll(makeScrollEvent(0));
    });
    act(() => {
      result.current.androidPullProps.onTouchStart!(makeTouchEvent(100));
      result.current.androidPullProps.onTouchMove!(makeTouchEvent(120)); // 20 * 0.5 = 10 < 70
    });
    act(() => {
      result.current.androidPullProps.onTouchEnd!();
    });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(result.current.pullDistance.value).toBe(0);
  });

  it('touch cancel resets the pull indicator without refreshing', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handlePullScroll(makeScrollEvent(0));
      result.current.androidPullProps.onTouchStartCapture!(makeTouchEvent(100));
      result.current.androidPullProps.onTouchMoveCapture!(makeTouchEvent(220));
    });
    expect(result.current.pullDistance.value).toBe(60);

    act(() => {
      result.current.androidPullProps.onTouchCancelCapture!();
    });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(result.current.pullDistance.value).toBe(0);
  });

  it('touch handlers do not activate when scrolled down', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    // Scrolled down — not at top
    act(() => {
      result.current.handlePullScroll(makeScrollEvent(200));
    });
    act(() => {
      result.current.androidPullProps.onTouchStart!(makeTouchEvent(100));
      result.current.androidPullProps.onTouchMove!(makeTouchEvent(300));
    });
    expect(result.current.pullDistance.value).toBe(0);
  });

  it('touch handlers do not trigger during active refresh', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, true));

    act(() => {
      result.current.handlePullScroll(makeScrollEvent(0));
    });
    act(() => {
      result.current.androidPullProps.onTouchStart!(makeTouchEvent(100));
      result.current.androidPullProps.onTouchMove!(makeTouchEvent(300));
    });
    // Should not track pull because already refreshing
    expect(result.current.pullDistance.value).toBe(0);
  });

  it('cancels pull tracking when user drags up', () => {
    const { result } = renderHook(() => usePullToRefresh(jest.fn(), false));

    act(() => {
      result.current.handlePullScroll(makeScrollEvent(0));
    });
    act(() => {
      result.current.androidPullProps.onTouchStart!(makeTouchEvent(200));
      result.current.androidPullProps.onTouchMove!(makeTouchEvent(250)); // pulling down
    });
    expect(result.current.pullDistance.value).toBe(25); // 50 * 0.5

    act(() => {
      result.current.androidPullProps.onTouchMove!(makeTouchEvent(150)); // reversed direction
    });
    expect(result.current.pullDistance.value).toBe(0);
  });
});
