import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_5M } from '@/constants/queryConfig';
import { REVIEWS_PAGINATION } from '@/constants/paginationConfig';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import {
  fetchMovieReviews,
  fetchUserReviews,
  fetchMovieReviewsPaginated,
  fetchUserReviewsPaginated,
  createReview,
  updateReview,
  deleteReview,
  toggleHelpful,
} from './api';
import { CreateReviewInput, UpdateReviewInput, Review } from '@/types';

// @coupling: fetchMovieReviews joins profile:profiles(id, display_name, avatar_url) — matches Review type.
export function useMovieReviews(movieId: string) {
  return useQuery({
    queryKey: ['reviews', movieId],
    queryFn: () => fetchMovieReviews(movieId),
    enabled: !!movieId,
    staleTime: STALE_5M,
  });
}

export function useUserReviews(userId: string) {
  return useQuery({
    queryKey: ['reviews', 'user', userId],
    queryFn: () => fetchUserReviews(userId),
    enabled: !!userId,
    staleTime: STALE_5M,
  });
}

// --- Paginated review hooks ---

/** @contract Uses smart pagination for movie reviews */
// @coupling: query key ['reviews-paginated', movieId] is NOT invalidated by create.onSuccess which only invalidates ['reviews', movieId] (exact match). New reviews won't appear in the paginated list until staleTime expires. update/remove.onSuccess invalidates ['reviews'] prefix which DOES cover ['reviews-paginated'] — so edits/deletes propagate but creates don't.
export function useMovieReviewsPaginated(movieId: string) {
  return useSmartInfiniteQuery<Review>({
    queryKey: ['reviews-paginated', movieId],
    queryFn: (offset, limit) => fetchMovieReviewsPaginated(movieId, offset, limit),
    config: REVIEWS_PAGINATION,
    staleTime: STALE_5M,
    enabled: !!movieId,
  });
}

/** @contract Uses smart pagination for user reviews */
export function useUserReviewsPaginated(userId: string) {
  return useSmartInfiniteQuery<Review>({
    queryKey: ['reviews-paginated', 'user', userId],
    queryFn: (offset, limit) => fetchUserReviewsPaginated(userId, offset, limit),
    config: REVIEWS_PAGINATION,
    staleTime: STALE_5M,
    enabled: !!userId,
  });
}

// @sideeffect: create.onSuccess invalidates ['movie', movieId] which triggers useMovieDetail (movies/hooks/useMovieDetail.ts) to refetch. This is needed because the DB trigger update_movie_rating recalculates movies.rating and movies.review_count on review insert. Without this invalidation, the movie detail page would show stale rating/review_count.
// @edge: create invalidates ['reviews', movieId] (exact key), but update/remove/helpful invalidate ['reviews'] (prefix match across ALL movie reviews). This means creating a review only refreshes that movie's reviews, but editing/deleting refreshes ALL cached review lists (every movie's reviews page). This is overly broad for update/remove but ensures consistency.
// @coupling: toggleHelpful triggers a DB trigger (on_review_helpful_change_update_count) that recalculates reviews.helpful_count. But the invalidation here only refetches ['reviews'] — it does NOT invalidate ['movie', movieId] because helpful_count doesn't affect the movie's rating. If helpful_count were displayed on the movie detail page (outside the reviews list), it would be stale.
export function useReviewMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (input: CreateReviewInput) => createReview(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.movie_id] });
      queryClient.invalidateQueries({ queryKey: ['movie', variables.movie_id] });
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToSubmitReview'));
    },
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReviewInput; movieId: string }) =>
      updateReview(id, input),
    // @sync: invalidate movie query too — DB trigger recalculates rating+review_count on update
    onSuccess: (_data, { movieId }) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToUpdateReview'));
    },
  });

  const remove = useMutation({
    mutationFn: ({ id }: { id: string; movieId: string }) => deleteReview(id),
    // @sync: invalidate movie query too — DB trigger recalculates rating+review_count on delete
    onSuccess: (_data, { movieId }) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToDeleteReview'));
    },
  });

  const helpful = useMutation({
    mutationFn: ({ userId, reviewId }: { userId: string; reviewId: string }) =>
      toggleHelpful(userId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.somethingWentWrong'));
    },
  });

  return { create, update, remove, helpful };
}
