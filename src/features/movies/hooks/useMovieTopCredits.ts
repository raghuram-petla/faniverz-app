import { useQuery } from '@tanstack/react-query';
import { STALE_10M } from '@/constants/queryConfig';
import { fetchMovieTopCredits } from '../api';

// @contract Query key distinct from ['movie', id] — caches independently from full movie detail.
export function useMovieTopCredits(movieId: string | null) {
  return useQuery({
    queryKey: ['movieTopCredits', movieId],
    queryFn: () => fetchMovieTopCredits(movieId!),
    staleTime: STALE_10M,
    enabled: !!movieId,
  });
}
