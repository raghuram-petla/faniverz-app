import { useQuery } from '@tanstack/react-query';
import { fetchPlatforms, fetchOttReleases, fetchMoviePlatformMap } from './api';

export function usePlatforms() {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useOttReleases(movieId: string) {
  return useQuery({
    queryKey: ['ott', movieId],
    queryFn: () => fetchOttReleases(movieId),
    enabled: !!movieId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMoviePlatformMap(movieIds: string[]) {
  return useQuery({
    queryKey: ['movie-platforms', movieIds],
    queryFn: () => fetchMoviePlatformMap(movieIds),
    enabled: movieIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
