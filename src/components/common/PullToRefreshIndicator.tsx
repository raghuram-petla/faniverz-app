import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { PULL_THRESHOLD } from '@/hooks/usePullToRefresh';
import type { SharedValue } from 'react-native-reanimated';

const INDICATOR_HEIGHT = 48;

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

  const containerStyle = useAnimatedStyle(() => {
    const pullHeight = interpolate(
      pullDistance.value,
      [0, PULL_THRESHOLD],
      [0, INDICATOR_HEIGHT],
      Extrapolation.CLAMP,
    );
    const refreshHeight = isRefreshing.value ? INDICATOR_HEIGHT : 0;
    return {
      height: Math.max(pullHeight, refreshHeight),
      opacity: isRefreshing.value
        ? 1
        : interpolate(pullDistance.value, [0, 20], [0, 1], Extrapolation.CLAMP),
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pullDistance.value,
      [PULL_THRESHOLD - 15, PULL_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // Arrow rotates 0° → 180° as pull distance crosses threshold
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
      {refreshing ? (
        <ActivityIndicator size="small" color={theme.textPrimary} testID="refresh-spinner" />
      ) : (
        <Animated.View style={[styles.content, contentStyle]}>
          <Animated.View style={arrowRotateStyle}>
            <Feather name="arrow-up" size={16} color={theme.textPrimary} testID="pull-arrow" />
          </Animated.View>
          <Text style={[styles.text, { color: theme.textSecondary }]}>Release to refresh</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
