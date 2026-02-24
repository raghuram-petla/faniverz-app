import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchMoviesPaginated, MovieFilters } from '../api';

const PAGE_SIZE = 10;

export function useMoviesPaginated(filters?: MovieFilters) {
  return useInfiniteQuery({
    queryKey: ['movies-paginated', filters],
    queryFn: ({ pageParam }) => fetchMoviesPaginated(pageParam, PAGE_SIZE, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    staleTime: 5 * 60 * 1000,
  });
}
