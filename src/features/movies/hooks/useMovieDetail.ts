import { useQuery } from '@tanstack/react-query';
import { fetchMovieById } from '../api';

export function useMovieDetail(id: string) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: () => fetchMovieById(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}
