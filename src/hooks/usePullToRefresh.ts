import { useCallback, useEffect, useRef } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export const PULL_THRESHOLD = 70;

export function usePullToRefresh(onRefresh: () => void, refreshing: boolean) {
  const pullDistance = useSharedValue(0);
  const isRefreshing = useSharedValue(false);

  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    isRefreshing.value = refreshing;
  }, [refreshing]);

  const handlePullScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    pullDistance.value = Math.max(0, -e.nativeEvent.contentOffset.y);
  }, []);

  const handleScrollEndDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y < -PULL_THRESHOLD && !refreshingRef.current) {
      isRefreshing.value = true;
      onRefreshRef.current();
    }
  }, []);

  return { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag };
}
