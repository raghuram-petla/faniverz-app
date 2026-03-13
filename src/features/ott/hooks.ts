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

// @edge: queryKey includes the full movieIds array. If the array reference changes on every render
// (e.g., inline array literal in parent), TanStack Query treats it as a new key and refetches every render.
// Callers must ensure referential stability (useMemo) on the movieIds array to avoid infinite fetch loops.
// @coupling: movieIds order matters for cache hits — ['a','b'] and ['b','a'] produce different cache keys
// even though they fetch the same data. No sorting is applied before using as queryKey.
export function useMoviePlatformMap(movieIds: string[]) {
  return useQuery({
    queryKey: ['movie-platforms', movieIds],
    queryFn: () => fetchMoviePlatformMap(movieIds),
    enabled: movieIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
