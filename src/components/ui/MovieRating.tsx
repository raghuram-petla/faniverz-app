import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import type { ViewStyle, TextStyle } from 'react-native';

/** @contract rating is expected on a 0-5 scale; values above 5 are displayed as-is (no clamping) */
export interface MovieRatingProps {
  rating: number;
  size?: number;
  showMax?: boolean;
  reviewCount?: number;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * @contract Displays star icon + numeric rating; returns null for unrated (rating <= 0).
 * @nullable reviewCount is optional; only shown when present and > 0.
 */
export function MovieRating({
  rating,
  size = 12,
  showMax,
  reviewCount,
  containerStyle,
  textStyle,
}: MovieRatingProps) {
  // @edge Hides entire component when rating is 0 or negative (unrated movie)
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
