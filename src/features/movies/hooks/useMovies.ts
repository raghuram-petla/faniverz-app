import { useQuery } from '@tanstack/react-query';
import { STALE_5M } from '@/constants/queryConfig';
import { fetchMovies, MovieFilters } from '../api';

// @invariant: query key ['movies', filters] — admin sync and review mutations invalidate ['movies'] prefix. If this key changes, those invalidations silently miss and data goes stale.
export function useMovies(filters?: MovieFilters) {
  return useQuery({
    queryKey: ['movies', filters],
    queryFn: () => fetchMovies(filters),
    staleTime: STALE_5M,
  });
}
