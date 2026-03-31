import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
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
    expect(typeof result.current.handleScrollBeginDrag).toBe('function');
    expect(typeof result.current.handlePullScroll).toBe('function');
    expect(typeof result.current.handleScrollEndDrag).toBe('function');
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
      // No handleScrollBeginDrag called — simulates bounce-back
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

    // Simulate pull distance accumulated during drag
    act(() => {
      result.current.handleScrollBeginDrag();
      result.current.handlePullScroll(makeScrollEvent(-80));
    });
    expect(result.current.pullDistance.value).toBe(80);

    // When refresh completes, pullDistance should reset
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

  it('returns undefined refreshControl on iOS (default)', () => {
    const { result } = renderHook(() => usePullToRefresh(jest.fn(), false));
    expect(result.current.refreshControl).toBeUndefined();
  });

  it('returns undefined renderScrollComponent on iOS', () => {
    const { result } = renderHook(() => usePullToRefresh(jest.fn(), false));
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

  it('handlePullScroll is a no-op on Android (overscroll never goes negative)', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    act(() => {
      result.current.handleScrollBeginDrag();
      result.current.handlePullScroll(makeScrollEvent(-80));
    });
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

  it('returns a refreshControl React element on Android', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, false));

    expect(result.current.refreshControl).toBeDefined();
    // Should be a React element (has type property)
    expect(result.current.refreshControl).toHaveProperty('type');
  });

  it('returns a renderScrollComponent on Android for FlashList integration', () => {
    const { result } = renderHook(() => usePullToRefresh(jest.fn(), false));
    expect(result.current.renderScrollComponent).toBeDefined();
  });

  it('refreshControl element reflects refreshing prop', () => {
    const onRefresh = jest.fn();
    const { result, rerender } = renderHook(
      ({ refreshing }: { refreshing: boolean }) => usePullToRefresh(onRefresh, refreshing),
      { initialProps: { refreshing: false } },
    );
    const rc1 = result.current.refreshControl as React.ReactElement<{ refreshing: boolean }>;
    expect(rc1?.props?.refreshing).toBe(false);

    rerender({ refreshing: true });
    const rc2 = result.current.refreshControl as React.ReactElement<{ refreshing: boolean }>;
    expect(rc2?.props?.refreshing).toBe(true);
  });
});
