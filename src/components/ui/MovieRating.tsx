import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import type { ViewStyle, TextStyle } from 'react-native';

export interface MovieRatingProps {
  rating: number;
  size?: number;
  showMax?: boolean;
  reviewCount?: number;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export function MovieRating({
  rating,
  size = 12,
  showMax,
  reviewCount,
  containerStyle,
  textStyle,
}: MovieRatingProps) {
  if (rating <= 0) return null;

  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name="star" size={size} color={colors.yellow400} />
      <Text style={[styles.text, { fontSize: size }, textStyle]}>{rating}</Text>
      {showMax && <Text style={[styles.max, textStyle]}>/ 5</Text>}
      {reviewCount != null && reviewCount > 0 && (
        <Text style={[styles.reviewCount, textStyle]}>({reviewCount} reviews)</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontWeight: '600',
  },
  max: {
    fontSize: 12,
  },
  reviewCount: {
    fontSize: 12,
  },
});
