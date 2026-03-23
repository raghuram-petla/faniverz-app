import { useInfiniteQuery } from '@tanstack/react-query';
import { STALE_5M } from '@/constants/queryConfig';
import { fetchMoviesPaginated, MovieFilters } from '../api';

const PAGE_SIZE = 10;

// @coupling: PAGE_SIZE=10 must match the getNextPageParam boundary check — if fetchMoviesPaginated in ../api.ts applies
// additional server-side filters (e.g., RLS or language filtering) that reduce page below 10, pagination terminates early.
// @invariant: query key ['movies-paginated', filters] is separate from ['movies', filters] in useMovies.ts —
// mutations that invalidate ['movies'] (e.g., admin sync) will NOT invalidate this paginated cache. Both must be
// invalidated when movie data changes, or paginated lists show stale data.
export function useMoviesPaginated(filters?: MovieFilters) {
  return useInfiniteQuery({
    queryKey: ['movies-paginated', filters],
    queryFn: ({ pageParam }) => fetchMoviesPaginated(pageParam, PAGE_SIZE, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    staleTime: STALE_5M,
  });
}
