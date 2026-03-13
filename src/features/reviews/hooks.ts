import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import {
  fetchMovieReviews,
  fetchUserReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleHelpful,
} from './api';
import { CreateReviewInput, UpdateReviewInput } from '@/types';

// @coupling: fetchMovieReviews joins profile:profiles(display_name, avatar_url) but the Review type (src/types/review.ts) declares profile as Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>. The select does NOT include 'id' in the profile join — so profile.id will be undefined at runtime even though the type says it's there. Any UI code using review.profile?.id (e.g., navigating to user profile) will get undefined.
export function useMovieReviews(movieId: string) {
  return useQuery({
    queryKey: ['reviews', movieId],
    queryFn: () => fetchMovieReviews(movieId),
    enabled: !!movieId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserReviews(userId: string) {
  return useQuery({
    queryKey: ['reviews', 'user', userId],
    queryFn: () => fetchUserReviews(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
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
    mutationFn: ({ id, input }: { id: string; input: UpdateReviewInput }) =>
      updateReview(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToUpdateReview'));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
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
