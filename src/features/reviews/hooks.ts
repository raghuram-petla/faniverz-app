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
