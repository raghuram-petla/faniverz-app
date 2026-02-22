import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from '@/lib/constants';
import {
  fetchReviewsForMovie,
  fetchMyReview,
  insertReview,
  updateReview,
  deleteReview,
} from './api';
import type { ReviewInsert, ReviewUpdate, ReviewSortOption } from '@/types/review';

export const reviewKeys = {
  all: [QUERY_KEYS.REVIEWS] as const,
  movie: (movieId: number) => [QUERY_KEYS.REVIEWS, movieId] as const,
  movieSorted: (movieId: number, sort: ReviewSortOption) =>
    [QUERY_KEYS.REVIEWS, movieId, sort] as const,
  myReview: (movieId: number, userId: string) =>
    [QUERY_KEYS.REVIEWS, movieId, 'mine', userId] as const,
};

export function useReviews(movieId: number, sort: ReviewSortOption = 'recent') {
  return useInfiniteQuery({
    queryKey: reviewKeys.movieSorted(movieId, sort),
    queryFn: ({ pageParam = 0 }) => fetchReviewsForMovie(movieId, sort, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 10 ? allPages.length : undefined,
    staleTime: STALE_TIMES.REVIEWS,
    enabled: movieId > 0,
  });
}

export function useMyReview(movieId: number, userId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.myReview(movieId, userId!),
    queryFn: () => fetchMyReview(movieId, userId!),
    staleTime: STALE_TIMES.REVIEWS,
    enabled: movieId > 0 && !!userId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, review }: { userId: string; review: ReviewInsert }) =>
      insertReview(userId, review),
    onSuccess: (_data, { review }) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.movie(review.movie_id) });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MOVIE, review.movie_id],
      });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      movieId: _movieId,
      updates,
    }: {
      reviewId: number;
      movieId: number;
      updates: ReviewUpdate;
    }) => updateReview(reviewId, updates),
    onSuccess: (_data, { movieId }) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.movie(movieId) });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MOVIE, movieId],
      });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, movieId: _movieId }: { reviewId: number; movieId: number }) =>
      deleteReview(reviewId),
    onSuccess: (_data, { movieId }) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.movie(movieId) });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MOVIE, movieId],
      });
    },
  });
}
