import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import StarRating from '@/components/ui/StarRating';

interface ReviewSummaryProps {
  averageRating: number;
  totalCount: number;
  onWriteReview: () => void;
  onSeeAll: () => void;
}

export default function ReviewSummary({
  averageRating,
  totalCount,
  onWriteReview,
  onSeeAll,
}: ReviewSummaryProps) {
  const { colors } = useTheme();

  return (
    <View testID="review-summary" style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviews</Text>
        {totalCount > 0 && (
          <TouchableOpacity testID="see-all-reviews" onPress={onSeeAll}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      {totalCount > 0 ? (
        <View style={styles.stats}>
          <StarRating rating={averageRating} size={18} />
          <Text testID="average-rating" style={[styles.ratingText, { color: colors.text }]}>
            {averageRating.toFixed(1)}
          </Text>
          <Text testID="review-count" style={[styles.countText, { color: colors.textSecondary }]}>
            ({totalCount} {totalCount === 1 ? 'review' : 'reviews'})
          </Text>
        </View>
      ) : (
        <Text testID="no-reviews" style={[styles.emptyText, { color: colors.textTertiary }]}>
          No reviews yet. Be the first!
        </Text>
      )}

      <TouchableOpacity
        testID="write-review-button"
        style={[styles.writeButton, { backgroundColor: colors.primary }]}
        onPress={onWriteReview}
      >
        <Text style={styles.writeButtonText}>Write a Review</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
  },
  countText: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 12,
  },
  writeButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  writeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
