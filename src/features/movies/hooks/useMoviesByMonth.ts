import { useQuery } from '@tanstack/react-query';
import { STALE_5M } from '@/constants/queryConfig';
import { fetchMoviesByMonth } from '../api';

// @coupling: month param is 0-indexed (0=Jan) to match Date.getMonth(). Calendar screen passes this directly — if calendar ever switches to 1-indexed months, results shift by one month silently.
export function useMoviesByMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['movies', 'month', year, month],
    queryFn: () => fetchMoviesByMonth(year, month),
    staleTime: STALE_5M,
  });
}
