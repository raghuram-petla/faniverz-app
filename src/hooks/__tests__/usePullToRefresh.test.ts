import { renderHook, act } from '@testing-library/react-native';
import { usePullToRefresh, PULL_THRESHOLD } from '../usePullToRefresh';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const makeScrollEvent = (y: number): NativeSyntheticEvent<NativeScrollEvent> =>
  ({
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 400, height: 2000 },
      layoutMeasurement: { width: 400, height: 800 },
    },
  }) as NativeSyntheticEvent<NativeScrollEvent>;

describe('usePullToRefresh', () => {
  it('exports PULL_THRESHOLD constant', () => {
    expect(PULL_THRESHOLD).toBe(70);
  });

  it('returns expected shape', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));
    expect(result.current.pullDistance).toHaveProperty('value');
    expect(result.current.isRefreshing).toHaveProperty('value');
    expect(typeof result.current.handlePullScroll).toBe('function');
    expect(typeof result.current.handleScrollEndDrag).toBe('function');
  });

  it('handlePullScroll tracks negative contentOffset as positive pullDistance', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handlePullScroll(makeScrollEvent(-50));
    });
    expect(result.current.pullDistance.value).toBe(50);
  });

  it('handlePullScroll clamps positive offsets to 0', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handlePullScroll(makeScrollEvent(100));
    });
    expect(result.current.pullDistance.value).toBe(0);
  });

  it('handleScrollEndDrag triggers onRefresh when past threshold', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handleScrollEndDrag(makeScrollEvent(-(PULL_THRESHOLD + 1)));
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isRefreshing.value).toBe(true);
  });

  it('handleScrollEndDrag does NOT trigger when above threshold', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handleScrollEndDrag(makeScrollEvent(-(PULL_THRESHOLD + 1) + 10));
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('handleScrollEndDrag does NOT trigger when already refreshing', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, true));

    act(() => {
      result.current.handleScrollEndDrag(makeScrollEvent(-(PULL_THRESHOLD + 1)));
    });
    expect(onRefresh).not.toHaveBeenCalled();
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
});
