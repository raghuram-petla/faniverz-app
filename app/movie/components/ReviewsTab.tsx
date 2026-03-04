import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { StarRating } from '@/components/ui/StarRating';
import { formatDate } from '@/utils/formatDate';
import type { Review } from '@/types/review';
import { createStyles } from '../[id].styles';

interface ReviewsTabProps {
  rating: number;
  reviewCount: number;
  reviews: Review[];
  userId: string;
  onWriteReview: () => void;
  onHelpful: (reviewId: string) => void;
}

export function ReviewsTab({
  rating,
  reviewCount,
  reviews,
  userId,
  onWriteReview,
  onHelpful,
}: ReviewsTabProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.reviewsTab}>
      <View style={styles.ratingSummary}>
        <Ionicons name="star" size={32} color={colors.yellow400} />
        <Text style={styles.ratingSummaryValue}>{rating}</Text>
        <Text style={styles.ratingSummaryMax}>/5</Text>
        <Text style={styles.ratingSummaryCount}>({reviewCount} reviews)</Text>
      </View>

      <TouchableOpacity style={styles.writeReviewButton} onPress={onWriteReview}>
        <Ionicons name="create" size={20} color={colors.white} />
        <Text style={styles.writeReviewText}>Write Review</Text>
      </TouchableOpacity>

      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewAvatar}>
              <Ionicons name="person" size={16} color={theme.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewUserName}>{review.profile?.display_name ?? 'User'}</Text>
              <StarRating rating={review.rating} size={12} />
            </View>
            <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
          </View>
          {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}
          {review.body && (
            <Text style={styles.reviewBody} numberOfLines={4}>
              {review.body}
            </Text>
          )}
          {review.contains_spoiler && (
            <View style={styles.spoilerBadge}>
              <Text style={styles.spoilerBadgeText}>Contains Spoiler</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.helpfulButton}
            onPress={() => {
              if (userId) onHelpful(review.id);
            }}
            accessibilityLabel={`Mark review as helpful, ${review.helpful_count} found helpful`}
          >
            <Ionicons name="thumbs-up-outline" size={14} color={theme.textTertiary} />
            <Text style={styles.helpfulText}>{review.helpful_count}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
