import { STALE_5M } from '@/constants/queryConfig';
import { DISCOVER_PAGINATION } from '@/constants/paginationConfig';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { fetchMoviesPaginated, MovieFilters } from '../api';
import type { Movie } from '@shared/types';

// @contract: Uses smart pagination — loads 5 items initially for instant display,
// background-expands to 10 more. Dynamic threshold prefetches next page when 5 items remain.
// @invariant: query key ['movies-paginated', filters] is separate from ['movies', filters] in useMovies.ts —
// mutations that invalidate ['movies'] (e.g., admin sync) will NOT invalidate this paginated cache. Both must be
// invalidated when movie data changes, or paginated lists show stale data.
export function useMoviesPaginated(filters?: MovieFilters) {
  return useSmartInfiniteQuery<Movie>({
    queryKey: ['movies-paginated', filters],
    queryFn: (offset, limit) => fetchMoviesPaginated(offset, limit, filters),
    config: DISCOVER_PAGINATION,
    staleTime: STALE_5M,
  });
}
