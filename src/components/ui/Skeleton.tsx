import { useEffect, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import type { SemanticTheme } from '@shared/themes';

interface SkeletonProps {
  width: number;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={style}>
      <Animated.View
        style={[
          styles.skeleton,
          {
            width,
            height,
            borderRadius,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    skeleton: {
      backgroundColor: t.input,
    },
  });
