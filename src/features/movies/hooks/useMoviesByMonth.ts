import { useQuery } from '@tanstack/react-query';
import { fetchMoviesByMonth } from '../api';

export function useMoviesByMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['movies', 'month', year, month],
    queryFn: () => fetchMoviesByMonth(year, month),
    staleTime: 5 * 60 * 1000,
  });
}
