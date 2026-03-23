import { useQuery } from '@tanstack/react-query';
import { STALE_10M } from '@/constants/queryConfig';
import { fetchMovieById } from '../api';

// @invariant: query key ['movie', id] — useReviewMutations invalidates ['movie', movieId] after create/update/delete. Key mismatch = stale rating and review_count on movie detail screen.
export function useMovieDetail(id: string) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: () => fetchMovieById(id),
    staleTime: STALE_10M,
    enabled: !!id,
  });
}
