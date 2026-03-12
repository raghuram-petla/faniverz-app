import { useCallback, type ReactNode } from 'react';
import { Pressable, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

const AnimatedPressableView = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Scale factor on press-in (default 0.97) */
  pressScale?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
  testID?: string;
}

export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  disabled,
  pressScale = 0.97,
  accessibilityLabel,
  accessibilityRole = 'button',
  testID,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const animationsEnabled = useAnimationsEnabled();

  const handlePressIn = useCallback(() => {
    scale.value = animationsEnabled ? withTiming(pressScale, { duration: 100 }) : pressScale;
  }, [scale, pressScale, animationsEnabled]);

  const handlePressOut = useCallback(() => {
    scale.value = animationsEnabled ? withSpring(1, { damping: 15, stiffness: 200 }) : 1;
  }, [scale, animationsEnabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableView
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </AnimatedPressableView>
  );
}
