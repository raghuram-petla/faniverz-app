import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
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
        const StarWrapper = interactive ? TouchableOpacity : View;
        return (
          <StarWrapper
            key={star}
            onPress={interactive ? () => onRate?.(star) : undefined}
            accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
            accessibilityRole={interactive ? 'button' : undefined}
          >
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? colors.yellow400 : theme.textDisabled}
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
