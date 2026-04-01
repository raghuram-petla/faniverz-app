/**
 * @contract App-wide prefetch orchestrator. Runs silently in the background to
 * warm TanStack Query caches so screens/filters are ready before the user navigates.
 *
 * Two phases:
 *   Phase 1 (immediate): platforms + movies — auth-independent, needed by Spotlight
 *   Phase 2 (deferred): feed filter variants + news feed + upcoming movies —
 *     triggered once the 'all' personalized feed first page settles
 *
 * @coupling Query keys and getNextPageParam logic MUST mirror the source hooks
 * (usePersonalizedFeed, useNewsFeed, useUpcomingMovies, useMovies, usePlatforms).
 * Any drift causes cache misses and the prefetch becomes a no-op.
 *
 * @sync getOffset/getPageSize formulas duplicated from useSmartInfiniteQuery's
 * private helpers. If the offset formula changes there, update here too.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { fetchPlatforms, fetchMoviePlatformMap } from '@/features/ott/api';
import { fetchMovies, fetchUpcomingMovies } from '@/features/movies/api';
import { fetchPersonalizedFeed, fetchNewsFeed } from '@/features/feed/api';
import {
  FEED_PAGINATION,
  NEWS_FEED_PAGINATION,
  CALENDAR_PAGINATION,
} from '@/constants/paginationConfig';
import type { SmartPaginationConfig } from '@/constants/paginationConfig';
import { STALE_5M, STALE_24H } from '@/constants/queryConfig';
import type { FeedFilterOption } from '@/types';

// @contract Feed filter variants to prefetch (excludes 'all' which loads naturally)
const FEED_FILTER_VARIANTS: FeedFilterOption[] = [
  'trailers',
  'posters',
  'songs',
  'bts',
  'surprise',
  'updates',
];

/**
 * @sync Must mirror useSmartInfiniteQuery's private getNextPageParam exactly:
 *   getPageSize(0, config) = config.initialPageSize
 *   getPageSize(N, config) = config.expandedPageSize
 */
/* istanbul ignore next -- TanStack Query's internal scheduler prevents coverage collection for prefetch callbacks */
function makeGetNextPageParam(config: SmartPaginationConfig) {
  return (lastPage: unknown[], _allPages: unknown[][], lastPageParam: number) => {
    const expectedSize = lastPageParam === 0 ? config.initialPageSize : config.expandedPageSize;
    return lastPage.length < expectedSize ? undefined : lastPageParam + 1;
  };
}

/** @sync Must mirror useSmartInfiniteQuery's private getOffset/getPageSize */
/* istanbul ignore next -- TanStack Query's internal scheduler prevents coverage collection for prefetch callbacks */
function getOffset(pageParam: number, config: SmartPaginationConfig): number {
  if (pageParam === 0) return 0;
  return config.initialPageSize + (pageParam - 1) * config.expandedPageSize;
}

/* istanbul ignore next -- TanStack Query's internal scheduler prevents coverage collection for prefetch callbacks */
function getLimit(pageParam: number, config: SmartPaginationConfig): number {
  return pageParam === 0 ? config.initialPageSize : config.expandedPageSize;
}

/** Phase 1: auth-independent data needed by Spotlight */
function prefetchImmediate(qc: QueryClient) {
  // @coupling queryKey must match usePlatforms(): ['platforms']
  qc.prefetchQuery({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
    staleTime: STALE_24H,
  });
  // @coupling queryKey must match useMovies(): ['movies', undefined]
  // @sideeffect uses fetchQuery (not prefetchQuery) so we get data to chain
  // the movie-platform map prefetch — useMoviePlatformMap depends on movie IDs
  qc.fetchQuery({
    queryKey: ['movies', undefined],
    queryFn: () => fetchMovies(undefined),
    staleTime: STALE_5M,
  })
    .then((movies) => {
      if (!movies?.length) return;
      // @sync stableKey computation must match useMoviePlatformMap's useMemo:
      //   [...movieIds].sort().join(',')
      const stableKey = movies
        .map((m: { id: string }) => m.id)
        .sort()
        .join(',');
      // @coupling queryKey must match useMoviePlatformMap(): ['movie-platforms', stableKey]
      qc.prefetchQuery({
        queryKey: ['movie-platforms', stableKey],
        queryFn: () => fetchMoviePlatformMap(stableKey.split(',')),
        staleTime: STALE_5M,
      });
    })
    .catch(() => {
      // Prefetch failure is non-critical — Spotlight will fetch normally
    });
}

/** Phase 2: feed filter variants + news feed + calendar */
function prefetchDeferred(qc: QueryClient, userId: string | null) {
  const feedGnpp = makeGetNextPageParam(FEED_PAGINATION);

  // @coupling queryKey must match usePersonalizedFeed(filter): ['personalized-feed', filter, userId]
  for (const filter of FEED_FILTER_VARIANTS) {
    qc.prefetchInfiniteQuery({
      queryKey: ['personalized-feed', filter, userId] as const,
      queryFn: ({ pageParam }: { pageParam: number }) =>
        fetchPersonalizedFeed(
          userId,
          filter,
          getOffset(pageParam, FEED_PAGINATION),
          getLimit(pageParam, FEED_PAGINATION),
        ),
      initialPageParam: 0,
      pages: 1,
      getNextPageParam: feedGnpp,
      staleTime: STALE_5M,
    });
  }

  // @coupling queryKey must match useNewsFeed(): ['news-feed', undefined]
  qc.prefetchInfiniteQuery({
    queryKey: ['news-feed', undefined] as const,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchNewsFeed(
        undefined,
        getOffset(pageParam, NEWS_FEED_PAGINATION),
        getLimit(pageParam, NEWS_FEED_PAGINATION),
      ),
    initialPageParam: 0,
    pages: 1,
    getNextPageParam: makeGetNextPageParam(NEWS_FEED_PAGINATION),
    staleTime: STALE_5M,
  });

  // @coupling queryKey must match useUpcomingMovies(): ['upcoming-movies']
  qc.prefetchInfiniteQuery({
    queryKey: ['upcoming-movies'] as const,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchUpcomingMovies(
        getOffset(pageParam, CALENDAR_PAGINATION),
        getLimit(pageParam, CALENDAR_PAGINATION),
      ),
    initialPageParam: 0,
    pages: 1,
    getNextPageParam: makeGetNextPageParam(CALENDAR_PAGINATION),
    staleTime: STALE_5M,
  });
}

/**
 * @sideeffect Orchestrates app-wide prefetch in two phases.
 * Call once in the tab layout — it guards internally against duplicate execution.
 */
export function useAppPrefetch(): void {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  // @invariant phase2FiredRef ensures deferred prefetch fires at most once per auth identity
  const phase2FiredRef = useRef(false);
  const lastUserIdRef = useRef<string | null | undefined>(undefined);

  // Reset guard when auth identity changes (sign-in after anon session)
  useEffect(() => {
    if (lastUserIdRef.current !== undefined && lastUserIdRef.current !== userId) {
      phase2FiredRef.current = false;
    }
    lastUserIdRef.current = userId;
  }, [userId]);

  // Phase 1: fire once immediately, no auth dependency
  const phase1FiredRef = useRef(false);
  useEffect(() => {
    /* istanbul ignore next -- defensive: queryClient is stable, effect only fires once */
    if (phase1FiredRef.current) return;
    phase1FiredRef.current = true;
    prefetchImmediate(queryClient);
  }, [queryClient]);

  // Phase 2: subscribe to cache, fire once when 'all' personalized feed succeeds
  useEffect(() => {
    if (authLoading || phase2FiredRef.current) return;

    // @edge Check if 'all' feed is already cached (e.g., hot reload, fast auth)
    const existing = queryClient.getQueryState(['personalized-feed', 'all', userId]);
    if (existing?.status === 'success') {
      phase2FiredRef.current = true;
      prefetchDeferred(queryClient, userId);
      return;
    }

    // @sideeffect Subscribe to cache events and wait for the 'all' feed success
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      /* istanbul ignore next -- defensive: unsubscribe() is called immediately after phase2 fires */
      if (phase2FiredRef.current) return;
      // @assumes Only 'updated' events have an action field
      if (event.type !== 'updated') return;
      if (
        event.action.type === 'success' &&
        Array.isArray(event.query.queryKey) &&
        event.query.queryKey[0] === 'personalized-feed' &&
        event.query.queryKey[1] === 'all' &&
        event.query.queryKey[2] === userId
      ) {
        phase2FiredRef.current = true;
        unsubscribe();
        prefetchDeferred(queryClient, userId);
      }
    });

    return unsubscribe;
  }, [queryClient, userId, authLoading]);
}
