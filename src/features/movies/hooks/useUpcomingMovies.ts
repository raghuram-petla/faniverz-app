import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchUpcomingMovies } from '../api';

const PAGE_SIZE = 10;

export function useUpcomingMovies() {
  return useInfiniteQuery({
    queryKey: ['upcoming-movies'],
    queryFn: ({ pageParam }) => fetchUpcomingMovies(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    staleTime: 5 * 60 * 1000,
  });
}
