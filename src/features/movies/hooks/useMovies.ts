import { useQuery } from '@tanstack/react-query';
import { fetchMovies, MovieFilters } from '../api';

export function useMovies(filters?: MovieFilters) {
  return useQuery({
    queryKey: ['movies', filters],
    queryFn: () => fetchMovies(filters),
    staleTime: 5 * 60 * 1000,
  });
}
