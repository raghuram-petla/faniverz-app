import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
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
const INDICATOR_HEIGHT = INDICATOR_PILL_HEIGHT + INDICATOR_BOTTOM_GAP;

/**
 * @contract Renders pull-to-refresh visual feedback above scroll content on both platforms.
 * On iOS, pullDistance is driven by negative contentOffset (overscroll).
 * On Android, pullDistance is driven by touch-event tracking in usePullToRefresh.
 * @coupling usePullToRefresh hook — reads its shared values (pullDistance, isRefreshing).
 * @sync pullDistance and isRefreshing are worklet-thread shared values; refreshing is JS-thread boolean.
 */
export interface PullToRefreshIndicatorProps {
  pullDistance: SharedValue<number>;
  isRefreshing: SharedValue<boolean>;
  refreshing: boolean;
  topGap?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  refreshing,
  topGap = 0,
}: PullToRefreshIndicatorProps) {
  const { theme } = useTheme();
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;
  const [showRefreshing, setShowRefreshing] = useState(refreshing || isRefreshing.value);
  // @edge iOS pull refresh adds breathing room above the pill, while programmatic and Android refreshes can stay flush.
  const indicatorHeight = INDICATOR_HEIGHT + topGap;
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
  useAnimatedReaction(
    () => isRefreshing.value,
    (nextIsRefreshing, previousIsRefreshing) => {
      if (nextIsRefreshing === previousIsRefreshing) return;
      runOnJS(syncRefreshingVisual)(nextIsRefreshing);
    },
  );

  const title = showRefreshing ? 'Refreshing' : 'Release to refresh';

  // @invariant Container height is always max(pull-driven height, refresh-driven height)
  const containerStyle = useAnimatedStyle(() => {
    const pullHeight = interpolate(
      pullDistance.value,
      [0, PULL_THRESHOLD],
      [0, indicatorHeight],
      Extrapolation.CLAMP,
    );
    const refreshHeight = isRefreshing.value || refreshing ? indicatorHeight : 0;
    return {
      height: Math.max(pullHeight, refreshHeight),
      opacity:
        isRefreshing.value || refreshing
          ? 1
          : interpolate(pullDistance.value, [0, 20], [0, 1], Extrapolation.CLAMP),
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

  // @sync Arrow rotates 0deg to 180deg as pull distance crosses threshold (worklet-driven)
  const arrowRotateStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      pullDistance.value,
      [0, PULL_THRESHOLD],
      [0, 180],
      Extrapolation.CLAMP,
    );
    return { transform: [{ rotate: `${rotation}deg` }] };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {showRefreshing ? (
        <Animated.View
          style={[
            styles.pill,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.input,
            },
          ]} /* @edge programmatic refreshes need the same visible spinner even without pull distance */
          testID="refresh-pill"
        >
          <Animated.View
            style={
              styles.spinnerWrap
            } /* @edge Spinner stays visually lighter without the extra grey chip */
            testID="refresh-spinner-wrap"
          >
            <ActivityIndicator size="small" color={theme.textPrimary} testID="refresh-spinner" />
          </Animated.View>
          <Text style={[styles.text, { color: theme.textPrimary }]}>{title}</Text>
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.pill,
            contentStyle,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.input,
            },
          ]}
          testID="refresh-pill"
        >
          <Animated.View style={[styles.iconWrap, { backgroundColor: theme.input }]}>
            <Animated.View style={arrowRotateStyle}>
              <Feather name="arrow-up" size={16} color={theme.textPrimary} testID="pull-arrow" />
            </Animated.View>
          </Animated.View>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{title}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    paddingBottom: INDICATOR_BOTTOM_GAP,
  },
  // @edge Extra bottom gap prevents the indicator from feeling glued to the first feed item.
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
});
