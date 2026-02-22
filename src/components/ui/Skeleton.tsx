import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

export default function Skeleton({ width, height, borderRadius = 4, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View testID="skeleton" style={[{ width, height, borderRadius, overflow: 'hidden' }, style]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.border }, animatedStyle]}
      />
    </View>
  );
}
