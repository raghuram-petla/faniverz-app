import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { STALE_5M, STALE_24H } from '@/constants/queryConfig';
import {
  fetchPlatforms,
  fetchOttReleases,
  fetchMoviePlatformMap,
  fetchMovieAvailability,
} from './api';

// @coupling: staleTime 24h — platform list changes very rarely (new OTT service launch). Admin updates to
// ott_platforms table won't reflect on mobile for up to 24 hours unless user force-refreshes.
// @invariant: query key ['platforms'] is used by admin sync-engine to invalidate after platform create/update.
export function usePlatforms() {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
    staleTime: STALE_24H,
  });
}

// @coupling: fetchOttReleases joins ott_releases with ott_platforms to get platform name/logo. If the join
// column (platform_id) references a deleted platform, the row is silently excluded by the inner join.
export function useOttReleases(movieId: string) {
  return useQuery({
    queryKey: ['ott', movieId],
    queryFn: () => fetchOttReleases(movieId),
    enabled: !!movieId,
    staleTime: STALE_5M,
  });
}

// @contract: fetches availability grouped by type for the user's auto-detected country.
// @boundary: country detection happens server-side in fetchMovieAvailability — the hook has no input for country override.
// If the RPC returns empty for a country, the UI shows "not available" even if the movie streams in other regions.
export function useMovieAvailability(movieId: string) {
  return useQuery({
    queryKey: ['movie-availability', movieId],
    queryFn: () => fetchMovieAvailability(movieId),
    enabled: !!movieId,
    staleTime: STALE_5M,
  });
}

// @invariant: queryKey uses sorted movieIds for cache stability — ['a','b'] and ['b','a'] hit the same cache
// @edge: stabilize via join/split to prevent new array ref from triggering redundant queries
export function useMoviePlatformMap(movieIds: string[]) {
  const stableKey = useMemo(() => [...movieIds].sort().join(','), [movieIds]);
  const sortedIds = useMemo(() => (stableKey ? stableKey.split(',') : []), [stableKey]);

  return useQuery({
    queryKey: ['movie-platforms', stableKey],
    queryFn: () => fetchMoviePlatformMap(sortedIds),
    enabled: sortedIds.length > 0,
    staleTime: STALE_5M,
  });
}
