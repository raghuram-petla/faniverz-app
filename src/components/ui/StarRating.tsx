import { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

/**
 * @contract Renders a row of star icons; supports read-only display and interactive rating input.
 * @edge AnimatedStar only animates the pop effect on fill transition (unfilled -> filled), not on initial render.
 */
interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

// @invariant Stagger delay between each star pop animation
const STAGGER_MS = 50;

function AnimatedStar({
  filled,
  size,
  filledColor,
  emptyColor,
  index,
  animateOnFill,
}: {
  filled: boolean;
  size: number;
  filledColor: string;
  emptyColor: string;
  index: number;
  animateOnFill: boolean;
}) {
  const scale = useSharedValue(1);
  const prevFilled = useRef(filled);
  const animationsEnabled = useAnimationsEnabled();

  // @sideeffect Pop animation only fires on unfilled->filled transition (tracked via prevFilled ref)
  useEffect(() => {
    if (animationsEnabled && animateOnFill && filled && !prevFilled.current) {
      scale.value = withDelay(
        index * STAGGER_MS,
        withSequence(withTiming(1.3, { duration: 80 }), withTiming(1.0, { duration: 80 })),
      );
    }
    prevFilled.current = filled;
  }, [filled, scale, index, animateOnFill, animationsEnabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={filled ? 'star' : 'star-outline'}
        size={size}
        color={filled ? filledColor : emptyColor}
      />
    </Animated.View>
  );
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 16,
  interactive = false,
  onRate,
}: StarRatingProps) {
  const { theme, colors } = useTheme();
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      {stars.map((star) => {
        const filled = star <= rating;
        // @contract StarWrapper switches between pressable and inert based on interactive flag
        const StarWrapper = interactive ? TouchableOpacity : View;
        return (
          <StarWrapper
            key={star}
            onPress={interactive ? () => onRate?.(star) : undefined}
            accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
            accessibilityRole={interactive ? 'button' : undefined}
          >
            <AnimatedStar
              filled={filled}
              size={size}
              filledColor={colors.yellow400}
              emptyColor={theme.textDisabled}
              index={star - 1}
              animateOnFill={interactive}
            />
          </StarWrapper>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
  },
});
