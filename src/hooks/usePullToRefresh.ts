import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, RefreshControl } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

// @invariant PULL_THRESHOLD must stay positive; UI animation and trigger logic depend on it
export const PULL_THRESHOLD = 70;

// @contract caller must wire handleScrollBeginDrag/handlePullScroll/handleScrollEndDrag to a ScrollView's events
// @coupling reanimated shared values — pullDistance/isRefreshing drive the animated pull indicator
export function usePullToRefresh(onRefresh: () => void, refreshing: boolean) {
  const pullDistance = useSharedValue(0);
  const isRefreshing = useSharedValue(false);
  const isDragging = useRef(false);

  // @sync refs capture latest props to avoid stale closures inside stable callbacks
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // @sideeffect syncs React refreshing state into reanimated shared value; resets pullDistance on completion
  // @edge intentionally omits pullDistance/isRefreshing from deps — stable shared value refs, not state
  useEffect(() => {
    isRefreshing.value = refreshing;
    if (!refreshing) {
      pullDistance.value = 0;
    }
  }, [refreshing]);

  const handleScrollBeginDrag = useCallback(() => {
    isDragging.current = true;
  }, []);

  // @assumes iOS only: Android overscroll never produces negative contentOffset;
  // Android pull-to-refresh is handled natively via the refreshControl return value.
  const handlePullScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isDragging.current || Platform.OS === 'android') return;
    pullDistance.value = Math.max(0, -e.nativeEvent.contentOffset.y);
  }, []);

  // @edge if user releases exactly at -PULL_THRESHOLD, the < check means refresh does NOT trigger (must exceed)
  // @assumes iOS only: Android uses native RefreshControl, not scroll-end detection
  const handleScrollEndDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDragging.current = false;
    if (Platform.OS === 'android') return;
    if (e.nativeEvent.contentOffset.y < -PULL_THRESHOLD && !refreshingRef.current) {
      isRefreshing.value = true;
      onRefreshRef.current();
    } else {
      pullDistance.value = 0;
    }
  }, []);

  // @sideeffect On Android, returns a native RefreshControl to wire into the scroll component's
  // refreshControl prop. The native spinner appears both on pull gesture AND when refreshing=true
  // (e.g. triggered programmatically via tab press). iOS uses the custom pull animation instead.
  const refreshControl =
    Platform.OS === 'android'
      ? React.createElement(RefreshControl, { refreshing, onRefresh })
      : undefined;

  return {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    refreshControl,
  };
}
