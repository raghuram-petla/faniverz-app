import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from '@/lib/constants';
import { fetchMoviesByMonth } from '../api/movies';

export function useMoviesByMonth(year: number, month: number) {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIES, year, month],
    queryFn: () => fetchMoviesByMonth(year, month),
    staleTime: STALE_TIMES.MOVIES,
  });
}
