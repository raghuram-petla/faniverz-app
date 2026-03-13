import { useEffect, type ReactNode } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

/**
 * @contract Wraps a child in a staggered fade+slide entrance animation.
 * @edge When animationsEnabled is false, children render at final position immediately (no flash).
 * @boundary Delay is capped at maxDelay to prevent long lists from delaying last items excessively.
 */
export interface AnimatedListItemProps {
  children: ReactNode;
  /** Index in the list -- used to calculate stagger delay */
  index: number;
  /** Delay between each item in ms (default 80) */
  stagger?: number;
  /** Max delay cap in ms (default 400) -- prevents excessive delays for long lists */
  maxDelay?: number;
  /** Entrance direction: 'up' slides from below, 'right' slides from the right (default 'up') */
  direction?: 'up' | 'right';
  /** Translation distance in px (default 30) */
  distance?: number;
}

const DURATION = 300;
const EASING = Easing.out(Easing.ease);

export function AnimatedListItem({
  children,
  index,
  stagger = 80,
  maxDelay = 400,
  direction = 'up',
  distance = 30,
}: AnimatedListItemProps) {
  const animationsEnabled = useAnimationsEnabled();
  const opacity = useSharedValue(animationsEnabled ? 0 : 1);
  const translate = useSharedValue(animationsEnabled ? distance : 0);
  const delay = Math.min(index * stagger, maxDelay);

  useEffect(() => {
    if (animationsEnabled) {
      opacity.value = withDelay(delay, withTiming(1, { duration: DURATION, easing: EASING }));
      translate.value = withDelay(delay, withTiming(0, { duration: DURATION, easing: EASING }));
    } else {
      opacity.value = 1;
      translate.value = 0;
    }
  }, [opacity, translate, delay, animationsEnabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      direction === 'up' ? { translateY: translate.value } : { translateX: translate.value },
    ],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
