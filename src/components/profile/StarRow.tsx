import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

// @contract: displays 1-5 stars (full, half, or outline) based on numeric rating
export interface StarRowProps {
  rating: number;
  styles: { starRow: Record<string, unknown> };
}

export function StarRow({ rating, styles }: StarRowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-outline'}
          size={14}
          color={colors.yellow400}
        />
      ))}
    </View>
  );
}
