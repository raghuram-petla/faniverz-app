import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from '@/lib/constants';
import { fetchOttReleases, fetchPlatforms, fetchRecentOttReleases } from './api';

export function useOttReleases(movieId: number) {
  return useQuery({
    queryKey: [QUERY_KEYS.OTT_RELEASES, movieId],
    queryFn: () => fetchOttReleases(movieId),
    staleTime: STALE_TIMES.OTT_RELEASES,
    enabled: movieId > 0,
  });
}

export function useRecentOttReleases() {
  return useQuery({
    queryKey: [QUERY_KEYS.OTT_RELEASES, 'recent'],
    queryFn: fetchRecentOttReleases,
    staleTime: STALE_TIMES.OTT_RELEASES,
  });
}

export function usePlatforms() {
  return useQuery({
    queryKey: [QUERY_KEYS.PLATFORMS],
    queryFn: fetchPlatforms,
    staleTime: STALE_TIMES.PLATFORMS,
  });
}
