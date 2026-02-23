import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReviewInput }) =>
      updateReview(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const helpful = useMutation({
    mutationFn: ({ userId, reviewId }: { userId: string; reviewId: string }) =>
      toggleHelpful(userId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  return { create, update, remove, helpful };
}
