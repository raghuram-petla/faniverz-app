import { useInfiniteQuery } from '@tanstack/react-query';
import { STALE_5M } from '@/constants/queryConfig';
import { fetchUpcomingMovies } from '../api';

const PAGE_SIZE = 10;

// @coupling: PAGE_SIZE=10 must match the getNextPageParam check — if fetchUpcomingMovies in ../api.ts applies additional filters that reduce results below 10, pagination stops prematurely.
export function useUpcomingMovies() {
  return useInfiniteQuery({
    queryKey: ['upcoming-movies'],
    queryFn: ({ pageParam }) => fetchUpcomingMovies(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    staleTime: STALE_5M,
  });
}
