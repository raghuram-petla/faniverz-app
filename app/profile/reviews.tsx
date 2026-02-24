import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useUserReviews, useReviewMutations } from '@/features/reviews/hooks';
import { Review } from '@/types';
import { colors } from '@/theme/colors';

const PLACEHOLDER_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200';

type SortKey = 'recent' | 'rating' | 'helpful';

function StarRow({ rating }: { rating: number }) {
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyReviewsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: reviews, isLoading } = useUserReviews(user?.id ?? '');
  const { remove } = useReviewMutations();

  const [sortKey, setSortKey] = useState<SortKey>('recent');

  const sorted = useMemo(() => {
    if (!reviews) return [];
    const copy = [...reviews];
    if (sortKey === 'recent') {
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    if (sortKey === 'rating') {
      return copy.sort((a, b) => b.rating - a.rating);
    }
    // helpful
    return copy.sort((a, b) => b.helpful_count - a.helpful_count);
  }, [reviews, sortKey]);

  const totalReviews = reviews?.length ?? 0;
  const avgRating =
    totalReviews > 0
      ? (reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : '—';
  const totalHelpful = reviews?.reduce((sum, r) => sum + r.helpful_count, 0) ?? 0;

  const handleDelete = (review: Review) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate(review.id),
      },
    ]);
  };

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'rating', label: 'Rating' },
    { key: 'helpful', label: 'Helpful' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalReviews}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.ratingValueRow}>
            <Ionicons name="star" size={14} color={colors.yellow400} />
            <Text style={styles.statValue}>{avgRating}</Text>
          </View>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalHelpful}</Text>
          <Text style={styles.statLabel}>Helpful</Text>
        </View>
      </View>

      {/* Sort Buttons */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sortButton, sortKey === opt.key && styles.sortButtonActive]}
            onPress={() => setSortKey(opt.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.sortButtonText, sortKey === opt.key && styles.sortButtonTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.red600} />
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={48} color={colors.white20} />
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptySubtitle}>Your movie reviews will appear here.</Text>
        </View>
      ) : (
        <View style={styles.reviewList}>
          {sorted.map((review) => {
            const posterUrl = review.movie?.poster_url ?? PLACEHOLDER_POSTER;
            const movieTitle = review.movie?.title ?? 'Unknown Movie';
            return (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  {/* Poster */}
                  <Image
                    source={{ uri: posterUrl }}
                    style={styles.poster}
                    contentFit="cover"
                    transition={200}
                  />
                  {/* Info */}
                  <View style={styles.reviewInfo}>
                    <Text style={styles.movieTitle} numberOfLines={2}>
                      {movieTitle}
                    </Text>
                    <StarRow rating={review.rating} />
                    {review.title ? (
                      <Text style={styles.reviewTitle} numberOfLines={1}>
                        {review.title}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Body */}
                {review.body ? (
                  <Text style={styles.reviewBody} numberOfLines={3}>
                    {review.body}
                  </Text>
                ) : null}

                {/* Footer */}
                <View style={styles.reviewFooter}>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                    <View style={styles.helpfulBadge}>
                      <Ionicons name="thumbs-up-outline" size={12} color={colors.white40} />
                      <Text style={styles.helpfulText}>{review.helpful_count} helpful</Text>
                    </View>
                  </View>
                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      activeOpacity={0.7}
                      onPress={() => router.push(`/movie/${review.movie_id}`)}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.white60} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      activeOpacity={0.7}
                      onPress={() => handleDelete(review)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.red500} />
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  centered: {
    paddingVertical: 64,
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  headerPlaceholder: {
    width: 40,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.white10,
    gap: 4,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: colors.white50,
    textAlign: 'center',
  },

  // Sort
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white10,
  },
  sortButtonActive: {
    backgroundColor: colors.red600,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white50,
  },
  sortButtonTextActive: {
    color: colors.white,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.white40,
    textAlign: 'center',
  },

  // Review List
  reviewList: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: colors.white5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white10,
    padding: 16,
    gap: 12,
  },
  reviewTop: {
    flexDirection: 'row',
    gap: 12,
  },
  poster: {
    width: 64,
    height: 96,
    borderRadius: 8,
    flexShrink: 0,
  },
  reviewInfo: {
    flex: 1,
    gap: 6,
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white60,
    fontStyle: 'italic',
  },
  reviewBody: {
    fontSize: 14,
    color: colors.white60,
    lineHeight: 20,
  },

  // Footer
  reviewFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.white10,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewMeta: {
    gap: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.white40,
  },
  helpfulBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpfulText: {
    fontSize: 12,
    color: colors.white40,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.white10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white60,
  },
  deleteButton: {
    backgroundColor: colors.red600_20,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.red500,
  },
});
