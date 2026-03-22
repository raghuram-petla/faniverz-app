import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchPlatforms,
  fetchOttReleases,
  fetchMoviePlatformMap,
  fetchMovieAvailability,
} from './api';

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

/** @contract Fetches availability grouped by type for the user's auto-detected country */
export function useMovieAvailability(movieId: string) {
  return useQuery({
    queryKey: ['movie-availability', movieId],
    queryFn: () => fetchMovieAvailability(movieId),
    enabled: !!movieId,
    staleTime: 5 * 60 * 1000,
  });
}

// @invariant: queryKey uses sorted movieIds for cache stability — ['a','b'] and ['b','a'] hit the same cache
export function useMoviePlatformMap(movieIds: string[]) {
  const sortedIds = useMemo(() => [...movieIds].sort(), [movieIds]);

  return useQuery({
    queryKey: ['movie-platforms', sortedIds],
    queryFn: () => fetchMoviePlatformMap(sortedIds),
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
