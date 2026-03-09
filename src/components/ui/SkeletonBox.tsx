import { useEffect } from 'react';
import { View, ViewStyle, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';

interface SkeletonBoxProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  testID?: string;
}

export function SkeletonBox({ width, height, borderRadius = 8, style, testID }: SkeletonBoxProps) {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(-screenWidth);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(screenWidth, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [translateX, screenWidth]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      testID={testID}
      style={[
        {
          width: width as number,
          height: height as number,
          borderRadius,
          backgroundColor: theme.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[{ position: 'absolute', top: 0, bottom: 0, width: screenWidth }, shimmerStyle]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
