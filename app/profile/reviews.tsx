import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import ScreenHeader from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useUserReviews, useReviewMutations } from '@/features/reviews/hooks';
import { ReviewModal } from '@/components/movie/detail/ReviewModal';
import { Review } from '@/types';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { ReviewsContentSkeleton } from '@/components/profile/ReviewsContentSkeleton';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { formatDate } from '@/utils/formatDate';
import { createStyles } from '@/styles/profile/reviews.styles';
import { StarRow } from '@/components/profile/StarRow';
import { getImageUrl, posterBucket } from '@shared/imageUrl';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

type SortKey = 'recent' | 'rating' | 'helpful';

// @boundary: My Reviews — user's review history with sort, edit, and delete capabilities
// @coupling: useUserReviews, useReviewMutations (update/remove) — backed by reviews table
export default function MyReviewsScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // @contract: useUserReviews joins reviews with movie data (poster_url, title) for display
  const {
    data: reviews,
    isLoading,
    refetch,
  } = useUserReviews(user?.id ?? /* istanbul ignore next */ '');
  const { update, remove } = useReviewMutations();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    refreshControl,
  } = usePullToRefresh(onRefresh, refreshing);

  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSpoiler, setEditSpoiler] = useState(false);

  // @contract: three sort modes — recent (date desc), rating (desc), helpful (count desc)
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
      ? (
          (reviews?.reduce((sum, r) => sum + r.rating, 0) ?? /* istanbul ignore next */ 0) /
          totalReviews
        ).toFixed(1)
      : '—';
  const totalHelpful =
    reviews?.reduce((sum, r) => sum + r.helpful_count, 0) ?? /* istanbul ignore next */ 0;

  // @sync: populates all edit form fields from the review being edited
  // @nullable: review.title and review.body may be null
  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditTitle(review.title ?? /* istanbul ignore next */ '');
    setEditBody(review.body ?? /* istanbul ignore next */ '');
    setEditSpoiler(review.contains_spoiler);
  };

  // @edge: guards against submitting with no review selected or zero rating
  // @sideeffect: clears editingReview on success which closes the ReviewModal
  const handleEditSubmit = () => {
    if (!editingReview || editRating === 0) return;
    update.mutate(
      {
        id: editingReview.id,
        input: {
          rating: editRating,
          title: editTitle,
          body: editBody,
          contains_spoiler: editSpoiler,
        },
        movieId: editingReview.movie_id,
      },
      { onSuccess: () => setEditingReview(null) },
    );
  };

  // @sideeffect: irreversible — deletes the review from DB after confirmation dialog
  const handleDelete = (review: Review) => {
    Alert.alert(t('profile.deleteReview'), t('profile.deleteReviewConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => remove.mutate({ id: review.id, movieId: review.movie_id }),
      },
    ]);
  };

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'recent', label: t('profile.sortRecent') },
    { key: 'rating', label: t('profile.sortRating') },
    { key: 'helpful', label: t('profile.sortHelpful') },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      onScroll={handlePullScroll}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      scrollEventThrottle={16}
      refreshControl={refreshControl}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        refreshing={refreshing}
      />
      {/* Header */}
      <ScreenHeader title={t('profile.myReviews')} />

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalReviews}</Text>
          <Text style={styles.statLabel}>{t('profile.reviewsStat')}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.ratingValueRow}>
            <Ionicons name="star" size={14} color={colors.yellow400} />
            <Text style={styles.statValue}>{avgRating}</Text>
          </View>
          <Text style={styles.statLabel}>{t('profile.avgRating')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalHelpful}</Text>
          <Text style={styles.statLabel}>{t('profile.sortHelpful')}</Text>
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
        <ReviewsContentSkeleton />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="star-outline"
          title={t('profile.noReviews')}
          subtitle={t('profile.noReviewsSubtitle')}
        />
      ) : (
        <View style={styles.reviewList}>
          {sorted.map((review) => {
            const posterUrl =
              getImageUrl(
                review.movie?.poster_url ?? null,
                'sm',
                posterBucket(review.movie?.poster_image_type),
              ) ?? PLACEHOLDER_POSTER;
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
                    <StarRow rating={review.rating} styles={styles} />
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
                      <Ionicons name="thumbs-up-outline" size={12} color={theme.textTertiary} />
                      <Text style={styles.helpfulText}>
                        {review.helpful_count} {t('profile.helpful')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      activeOpacity={0.7}
                      onPress={() => handleEdit(review)}
                      // @contract: disabled while update is in-flight to prevent duplicate edits
                      disabled={update.isPending}
                    >
                      <Ionicons name="create-outline" size={16} color={theme.textSecondary} />
                      <Text style={styles.actionText}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      activeOpacity={0.7}
                      onPress={() => handleDelete(review)}
                      // @contract: disabled while remove is in-flight to prevent duplicate deletes
                      disabled={remove.isPending}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.red500} />
                      <Text style={styles.deleteText}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <ReviewModal
        visible={!!editingReview}
        isEditing
        movieTitle={editingReview?.movie?.title ?? ''}
        posterUrl={editingReview?.movie?.poster_url ?? null}
        releaseYear={null}
        director={null}
        reviewRating={editRating}
        reviewTitle={editTitle}
        reviewBody={editBody}
        containsSpoiler={editSpoiler}
        onRatingChange={setEditRating}
        onTitleChange={setEditTitle}
        onBodyChange={setEditBody}
        onSpoilerToggle={() => setEditSpoiler((v) => !v)}
        onSubmit={handleEditSubmit}
        onClose={() => setEditingReview(null)}
      />
    </ScrollView>
  );
}
