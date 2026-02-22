import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from '@/lib/constants';
import { fetchMovieDetail, fetchMovieCast } from '../api/movies';

export function useMovieDetail(id: number) {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE, id],
    queryFn: () => fetchMovieDetail(id),
    staleTime: STALE_TIMES.MOVIE_DETAIL,
    enabled: id > 0,
  });
}

export function useMovieCast(movieId: number) {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE, movieId, 'cast'],
    queryFn: () => fetchMovieCast(movieId),
    staleTime: STALE_TIMES.MOVIE_DETAIL,
    enabled: movieId > 0,
  });
}
