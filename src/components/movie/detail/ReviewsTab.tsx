import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { StarRating } from '@/components/ui/StarRating';
import { formatDate } from '@/utils/formatDate';
import type { Review } from '@/types/review';
import { createStyles } from '@/styles/movieDetail.styles';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const styles = createStyles(theme);
  return (
    <View style={styles.reviewsTab}>
      <View style={styles.ratingSummary}>
        <Ionicons name="star" size={32} color={colors.yellow400} />
        <Text style={styles.ratingSummaryValue}>{rating}</Text>
        <Text style={styles.ratingSummaryMax}>{t('movie.outOf5')}</Text>
        <Text style={styles.ratingSummaryCount}>
          {t('movie.reviewCountLabel', { count: reviewCount })}
        </Text>
      </View>

      <TouchableOpacity style={styles.writeReviewButton} onPress={onWriteReview}>
        <Ionicons name="create" size={20} color={colors.white} />
        <Text style={styles.writeReviewText}>{t('movie.writeReview')}</Text>
      </TouchableOpacity>

      {reviews.length === 0 && (
        <Text
          style={{ color: theme.textTertiary, textAlign: 'center', marginTop: 24, fontSize: 14 }}
        >
          {t('movie.noReviewsYet')}
        </Text>
      )}

      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewAvatar}>
              <Ionicons name="person" size={16} color={theme.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewUserName} numberOfLines={1}>
                {review.profile?.display_name ?? t('movie.userFallback')}
              </Text>
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
              <Text style={styles.spoilerBadgeText}>{t('movie.containsSpoiler')}</Text>
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
