import { STALE_5M } from '@/constants/queryConfig';
import { CALENDAR_PAGINATION } from '@/constants/paginationConfig';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { fetchUpcomingMovies } from '../api';
import type { Movie } from '@shared/types';

// @contract: Uses smart pagination — loads 5 items initially, background-expands to 10 more.
export function useUpcomingMovies() {
  return useSmartInfiniteQuery<Movie>({
    queryKey: ['upcoming-movies'],
    queryFn: (offset, limit) => fetchUpcomingMovies(offset, limit),
    config: CALENDAR_PAGINATION,
    staleTime: STALE_5M,
  });
}
