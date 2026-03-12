import { useCallback, useEffect, useRef } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export const PULL_THRESHOLD = 70;

export function usePullToRefresh(onRefresh: () => void, refreshing: boolean) {
  const pullDistance = useSharedValue(0);
  const isRefreshing = useSharedValue(false);
  const isDragging = useRef(false);

  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    isRefreshing.value = refreshing;
    if (!refreshing) {
      pullDistance.value = 0;
    }
  }, [refreshing]);

  const handleScrollBeginDrag = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handlePullScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isDragging.current) return;
    pullDistance.value = Math.max(0, -e.nativeEvent.contentOffset.y);
  }, []);

  const handleScrollEndDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDragging.current = false;
    if (e.nativeEvent.contentOffset.y < -PULL_THRESHOLD && !refreshingRef.current) {
      isRefreshing.value = true;
      onRefreshRef.current();
    } else {
      pullDistance.value = 0;
    }
  }, []);

  return {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  };
}
