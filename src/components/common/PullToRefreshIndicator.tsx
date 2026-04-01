import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { PULL_THRESHOLD } from '@/hooks/usePullToRefresh';
import type { SharedValue } from 'react-native-reanimated';

const INDICATOR_BOTTOM_GAP = 20;
const INDICATOR_PILL_HEIGHT = 42;
export const INDICATOR_HEIGHT = INDICATOR_PILL_HEIGHT + INDICATOR_BOTTOM_GAP;

/**
 * @contract Renders pull-to-refresh visual feedback above scroll content on both platforms.
 * On iOS, pullDistance is driven by negative contentOffset (overscroll).
 * On Android, pullDistance is driven by touch-event tracking in usePullToRefresh.
 * @coupling usePullToRefresh hook — reads its shared values (pullDistance, isRefreshing).
 * @sync pullDistance and isRefreshing are worklet-thread shared values; refreshing is JS-thread boolean.
 * @edge When the spinner is active, a plain View is used instead of Animated.View so that
 * FlashList on Android can measure the header height correctly (animated styles are invisible
 * to FlashList's layout system).
 */
export interface PullToRefreshIndicatorProps {
  pullDistance: SharedValue<number>;
  isRefreshing: SharedValue<boolean>;
  refreshing: boolean;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  refreshing,
}: PullToRefreshIndicatorProps) {
  const { theme } = useTheme();
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;
  const [showRefreshing, setShowRefreshing] = useState(refreshing || isRefreshing.value);
  const indicatorHeight = INDICATOR_HEIGHT;
  const syncRefreshingVisual = useCallback(
    (nextIsRefreshing: boolean) => {
      setShowRefreshing(nextIsRefreshing || refreshingRef.current);
    },
    [setShowRefreshing],
  );

  useEffect(() => {
    setShowRefreshing(refreshing || isRefreshing.value);
  }, [refreshing, isRefreshing]);

  // @sync Bridges the worklet-thread refresh flag back into React so the spinner pill can
  // replace the arrow even when the surrounding list header does not rerender immediately.
  /* istanbul ignore next -- Reanimated worklet cannot execute in Jest */
  useAnimatedReaction(
    () => isRefreshing.value,
    (nextIsRefreshing, previousIsRefreshing) => {
      if (nextIsRefreshing === previousIsRefreshing) return;
      runOnJS(syncRefreshingVisual)(nextIsRefreshing);
    },
  );

  // @edge Use refreshing prop directly alongside showRefreshing state so the spinner
  // appears in the same render frame that the container expands — avoids a blank frame.
  const isSpinnerVisible = refreshing || showRefreshing;

  // @edge When spinner is active, render a plain View so FlashList can measure the header.
  // Animated.View height changes are invisible to FlashList's layout on Android.
  if (isSpinnerVisible) {
    return (
      <View
        style={[
          styles.container,
          { height: indicatorHeight, opacity: 1, paddingBottom: INDICATOR_BOTTOM_GAP },
        ]}
        testID="refresh-container"
      >
        <View
          style={[
            styles.pill,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.input },
          ]}
          testID="refresh-pill"
        >
          <View style={styles.spinnerWrap} testID="refresh-spinner-wrap">
            <ActivityIndicator size="small" color={theme.textPrimary} testID="refresh-spinner" />
          </View>
          <Text style={[styles.text, { color: theme.textPrimary }]}>Refreshing</Text>
        </View>
      </View>
    );
  }

  return <PullArrowIndicator pullDistance={pullDistance} indicatorHeight={indicatorHeight} />;
}

/**
 * @contract Animated pull-arrow indicator — only rendered during active pull gesture (not refreshing).
 * Separated so that the refreshing branch can use plain Views for FlashList compatibility.
 */
function PullArrowIndicator({
  pullDistance,
  indicatorHeight,
}: {
  pullDistance: SharedValue<number>;
  indicatorHeight: number;
}) {
  const { theme } = useTheme();

  // @invariant Container height is driven by pull distance during gesture
  const containerStyle = useAnimatedStyle(() => {
    const pullHeight = interpolate(
      pullDistance.value,
      [0, PULL_THRESHOLD],
      [0, indicatorHeight],
      Extrapolation.CLAMP,
    );
    return {
      height: pullHeight,
      paddingBottom: pullHeight > 0 ? INDICATOR_BOTTOM_GAP : 0,
      opacity: interpolate(pullDistance.value, [0, 20], [0, 1], Extrapolation.CLAMP),
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pullDistance.value,
      [PULL_THRESHOLD * 0.4, PULL_THRESHOLD * 0.85],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          pullDistance.value,
          [0, PULL_THRESHOLD],
          [12, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // @sync Arrow rotates 180deg (down) to 0deg (up) as pull distance crosses threshold (worklet-driven)
  const arrowRotateStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      pullDistance.value,
      [0, PULL_THRESHOLD],
      [180, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ rotate: `${rotation}deg` }] };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View
        style={[
          styles.pill,
          contentStyle,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.input },
        ]}
        testID="refresh-pill"
      >
        <Animated.View style={[styles.iconWrap, { backgroundColor: theme.input }]}>
          <Animated.View style={arrowRotateStyle}>
            <Feather name="arrow-up" size={16} color={theme.textPrimary} testID="pull-arrow" />
          </Animated.View>
        </Animated.View>
        <Text style={[styles.text, { color: theme.textSecondary }]}>Release to refresh</Text>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * @contract Android-only overlay that renders the "Refreshing" pill absolutely positioned
 * outside FlashList. FlashList on Android production builds does not reliably re-measure
 * ListHeaderComponent when its height changes dynamically, so the pill must live outside
 * the list to guarantee visibility.
 */
export interface RefreshingPillOverlayProps {
  visible: boolean;
  topOffset: number;
}

export function RefreshingPillOverlay({ visible, topOffset }: RefreshingPillOverlayProps) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <View
      style={[styles.overlayContainer, { top: topOffset }]}
      pointerEvents="none"
      testID="refresh-pill-overlay"
    >
      <View
        style={[styles.pill, { backgroundColor: theme.surfaceElevated, borderColor: theme.input }]}
      >
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="small" color={theme.textPrimary} />
        </View>
        <Text style={[styles.text, { color: theme.textPrimary }]}>Refreshing</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  pill: {
    minWidth: 164,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  overlayContainer: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center' as const,
    paddingBottom: INDICATOR_BOTTOM_GAP,
  },
});
