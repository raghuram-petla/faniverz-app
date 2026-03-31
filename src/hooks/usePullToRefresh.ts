import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  GestureResponderEvent,
  ScrollViewProps,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

// @invariant PULL_THRESHOLD must stay positive; UI animation and trigger logic depend on it
export const PULL_THRESHOLD = 70;

type AndroidScrollComponentProps = ScrollViewProps & {
  onTouchStartCapture?: (e: GestureResponderEvent) => void;
  onTouchMoveCapture?: (e: GestureResponderEvent) => void;
  onTouchEndCapture?: (e: GestureResponderEvent) => void;
  onTouchCancelCapture?: (e: GestureResponderEvent) => void;
  ref?: React.Ref<React.ElementRef<typeof GHScrollView>>;
};

const AndroidGestureScrollView =
  GHScrollView as unknown as React.ComponentType<AndroidScrollComponentProps>;

// @contract On iOS: uses negative contentOffset (overscroll) to detect pull distance.
// On Android: native RefreshControl is unreliable with new arch + GestureHandlerRootView,
// so we use raw touch events to detect pull-down when the scroll is at the top.
// Both platforms share the same PullToRefreshIndicator visual.
// @coupling reanimated shared values — pullDistance/isRefreshing drive the animated pull indicator
export function usePullToRefresh(onRefresh: () => void, refreshing: boolean) {
  const pullDistance = useSharedValue(0);
  const isRefreshing = useSharedValue(false);
  const isDragging = useRef(false);

  // --- Android touch-tracking refs ---
  // @sync scrollOffsetY tracks the current vertical scroll position so touch handlers
  // know whether the list is at the top (eligible for pull-to-refresh).
  const scrollOffsetY = useRef(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const isForcedRefreshing = useRef(false);

  // @sync refs capture latest props to avoid stale closures inside stable callbacks
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // @sideeffect syncs React refreshing state into reanimated shared value; imperative refresh visuals
  // can hold the spinner open across a fast refetch via isForcedRefreshing.
  // @edge intentionally omits pullDistance/isRefreshing from deps — stable shared value refs, not state
  useEffect(() => {
    if (refreshing) {
      isRefreshing.value = true;
      return;
    }
    if (!isForcedRefreshing.current) {
      isRefreshing.value = false;
      pullDistance.value = 0;
    }
  }, [refreshing]);

  const handleScrollBeginDrag = useCallback(() => {
    isDragging.current = true;
  }, []);

  // @contract On iOS: tracks negative contentOffset as pull distance while dragging.
  // On Android: only records scroll offset so touch handlers know if we're at the top.
  // @edge On Android, when isPulling is true, we freeze scrollOffsetY to prevent
  // the indicator's growing height from being misinterpreted as the user scrolling down.
  const handlePullScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Platform.OS === 'android') {
      if (!isPulling.current) {
        scrollOffsetY.current = e.nativeEvent.contentOffset.y;
      }
      return;
    }
    if (!isDragging.current) return;
    pullDistance.value = Math.max(0, -e.nativeEvent.contentOffset.y);
  }, []);

  // @edge if user releases exactly at -PULL_THRESHOLD, the < check means refresh does NOT trigger (must exceed)
  // @assumes iOS only: Android uses touch-based detection, not scroll-end detection
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

  // --- Android-only touch handlers ---
  // @assumes Android: contentOffset.y never goes negative, so we detect pull-down via
  // raw touch coordinates when the scroll is at the top (scrollOffsetY <= 0).
  const handleTouchStart = useCallback((e: GestureResponderEvent) => {
    if (Platform.OS !== 'android') return;
    if (scrollOffsetY.current <= 1 && !refreshingRef.current) {
      touchStartY.current = e.nativeEvent.pageY;
      isPulling.current = true;
    }
  }, []);

  // @contract pullDistance is dampened by 0.5× to give a resistance feel matching iOS rubber-band.
  // @edge If the user reverses direction (drags up), pull tracking is cancelled immediately.
  const handleTouchMove = useCallback((e: GestureResponderEvent) => {
    if (Platform.OS !== 'android' || !isPulling.current) return;
    const deltaY = e.nativeEvent.pageY - touchStartY.current;
    if (deltaY > 0 && scrollOffsetY.current <= 1) {
      pullDistance.value = deltaY * 0.5;
    } else {
      isPulling.current = false;
      pullDistance.value = 0;
    }
  }, []);

  // @sideeffect Triggers refresh if pull exceeded threshold, otherwise resets indicator.
  const handleTouchEnd = useCallback(() => {
    if (Platform.OS !== 'android' || !isPulling.current) return;
    isPulling.current = false;
    if (pullDistance.value >= PULL_THRESHOLD && !refreshingRef.current) {
      isRefreshing.value = true;
      onRefreshRef.current();
    } else {
      pullDistance.value = 0;
    }
  }, []);

  // @edge Android can cancel the touch sequence when a nested list takes over scrolling;
  // reset the indicator so wrapper-level capture handlers do not leave stale pull state behind.
  const handleTouchCancel = useCallback(() => {
    if (Platform.OS !== 'android') return;
    isPulling.current = false;
    pullDistance.value = 0;
  }, []);

  // @contract Lets screens show the spinner for programmatic refreshes without waiting for
  // a FlashList header rerender or a pull gesture callback.
  const showRefreshIndicator = useCallback(() => {
    isForcedRefreshing.current = true;
    isRefreshing.value = true;
  }, []);

  // @edge If the network refresh is still active, keep the spinner until refreshing flips false.
  const hideRefreshIndicator = useCallback(() => {
    isForcedRefreshing.current = false;
    if (!refreshingRef.current) {
      isRefreshing.value = false;
      pullDistance.value = 0;
    }
  }, []);

  // @contract FlashList on Android can pass this so touch tracking runs on the internal
  // native scroll view itself, which is more reliable than listening on a parent wrapper.
  const renderScrollComponent = useCallback(
    ({
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
      onTouchStartCapture,
      onTouchMoveCapture,
      onTouchEndCapture,
      onTouchCancelCapture,
      ref,
      ...props
    }: AndroidScrollComponentProps) =>
      React.createElement(AndroidGestureScrollView, {
        ref,
        ...props,
        onTouchStart: (e: GestureResponderEvent) => {
          onTouchStart?.(e);
          handleTouchStart(e);
        },
        onTouchMove: (e: GestureResponderEvent) => {
          onTouchMove?.(e);
          handleTouchMove(e);
        },
        onTouchEnd: (e: GestureResponderEvent) => {
          onTouchEnd?.(e);
          handleTouchEnd();
        },
        onTouchCancel: (e: GestureResponderEvent) => {
          onTouchCancel?.(e);
          handleTouchCancel();
        },
        onTouchStartCapture: (e: GestureResponderEvent) => {
          onTouchStartCapture?.(e);
          handleTouchStart(e);
        },
        onTouchMoveCapture: (e: GestureResponderEvent) => {
          onTouchMoveCapture?.(e);
          handleTouchMove(e);
        },
        onTouchEndCapture: (e: GestureResponderEvent) => {
          onTouchEndCapture?.(e);
          handleTouchEnd();
        },
        onTouchCancelCapture: (e: GestureResponderEvent) => {
          onTouchCancelCapture?.(e);
          handleTouchCancel();
        },
      }),
    [handleTouchCancel, handleTouchEnd, handleTouchMove, handleTouchStart],
  );

  return {
    pullDistance,
    isRefreshing,
    showRefreshIndicator,
    hideRefreshIndicator,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    // @contract No refreshControl on Android — native RefreshControl is broken with
    // new arch + Fabric + GestureHandlerRootView. Custom touch-based detection is used instead.
    refreshControl: undefined,
    renderScrollComponent: Platform.OS === 'android' ? renderScrollComponent : undefined,
    // @contract Spread these onto the scroll component or its wrapper for Android pull-to-refresh.
    // Capture handlers let wrapper Views observe nested FlashList gestures before the child consumes them.
    // On iOS these are no-ops (empty object).
    androidPullProps:
      Platform.OS === 'android'
        ? {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: handleTouchCancel,
            onTouchStartCapture: handleTouchStart,
            onTouchMoveCapture: handleTouchMove,
            onTouchEndCapture: handleTouchEnd,
            onTouchCancelCapture: handleTouchCancel,
          }
        : {},
  };
}
