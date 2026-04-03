/**
 * @contract Wraps useInfiniteQuery with two-phase loading:
 * 1. Page 0 uses initialPageSize (small, for instant first paint)
 * 2. Page 1+ uses expandedPageSize
 * 3. When backgroundExpand is true, auto-fetches page 2 after page 1 settles
 *
 * @contract Phased refetch (pull-to-refresh AND cache-restore):
 * Phase 1 (foreground): fetches page 0 only — isRefreshingFirstPage is true,
 *   callers (useRefresh) resolve quickly so the Refreshing pill hides fast.
 * Phase 2 (background): remaining cached pages refresh silently one-by-one
 *   via direct queryFn calls + setQueryData — no pill shown.
 *
 * @coupling Offset calculation for Supabase .range():
 *   page 0: offset=0, limit=initialPageSize
 *   page N: offset=initialPageSize + (N-1) * expandedPageSize, limit=expandedPageSize
 *   The queryFn receives (offset, limit) — API functions use these for .range(offset, offset+limit-1)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useQueryClient,
  keepPreviousData,
  type InfiniteData,
} from '@tanstack/react-query';
import { wasCacheRestored } from '@/lib/queryClient';
import type { SmartPaginationConfig } from '@/constants/paginationConfig';
import type { SmartInfiniteQueryResult, SmartInfiniteQueryOptions } from './smartPaginationTypes';

/** @contract Computes page size for a given page index */
function getPageSize(pageIndex: number, config: SmartPaginationConfig): number {
  return pageIndex === 0 ? config.initialPageSize : config.expandedPageSize;
}

/** @contract Computes absolute offset for a given page index, accounting for variable first page */
function getOffset(pageIndex: number, config: SmartPaginationConfig): number {
  if (pageIndex === 0) return 0;
  return config.initialPageSize + (pageIndex - 1) * config.expandedPageSize;
}

export function useSmartInfiniteQuery<TData extends { id: string }>({
  queryKey,
  queryFn,
  config,
  staleTime,
  enabled = true,
  keepPreviousData: shouldKeepPreviousData = false,
}: SmartInfiniteQueryOptions<TData>): SmartInfiniteQueryResult<TData> {
  const queryClient = useQueryClient();
  const [isBackgroundExpanding, setIsBackgroundExpanding] = useState(false);
  const [isRefreshingFirstPage, setIsRefreshingFirstPage] = useState(false);
  const hasExpandedRef = useRef(false);
  const hasTriggeredCacheRefreshRef = useRef(false);
  const serializedKey = JSON.stringify(queryKey);

  // @sync Refs for values used inside async callbacks to avoid stale closures.
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;
  const serializedKeyRef = useRef(serializedKey);
  serializedKeyRef.current = serializedKey;

  // @sync Reset expansion + cache-refresh tracking when queryKey changes (e.g., filter switch)
  useEffect(() => {
    hasExpandedRef.current = false;
    hasTriggeredCacheRefreshRef.current = false;
    setIsBackgroundExpanding(false);
  }, [serializedKey]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => {
      const offset = getOffset(pageParam, config);
      const limit = getPageSize(pageParam, config);
      return queryFn(offset, limit);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // @edge guard against undefined lastPage — can occur when setQueryData
      // replaces pages and TanStack recalculates hasNextPage mid-update
      /* istanbul ignore next -- defensive: lastPage is undefined only during mid-update race */
      if (!lastPage) return undefined;
      const expectedSize = getPageSize(lastPageParam, config);
      return lastPage.length < expectedSize ? undefined : lastPageParam + 1;
    },
    staleTime,
    enabled,
    // @sideeffect keepPreviousData shows stale data from the previous query key while the
    // new key fetches, preventing skeleton flash (e.g., when auth resolve changes userId)
    ...(shouldKeepPreviousData ? { placeholderData: keepPreviousData } : {}),
  });

  const { isSuccess, data, fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  // @sideeffect Background expansion: auto-fetch page 2 after page 1 settles
  // @sync cancelled flag prevents stale .finally() from clearing isBackgroundExpanding after query key change
  useEffect(() => {
    let cancelled = false;
    if (
      config.backgroundExpand &&
      isSuccess &&
      data?.pages.length === 1 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !hasExpandedRef.current
    ) {
      hasExpandedRef.current = true;
      setIsBackgroundExpanding(true);
      fetchNextPage().finally(() => {
        if (!cancelled) setIsBackgroundExpanding(false);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [
    config.backgroundExpand,
    isSuccess,
    data?.pages.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  // @contract Flatten all pages and deduplicate by id
  const allItems = useMemo(() => {
    if (!data?.pages) return [];
    const seen = new Set<string>();
    const items: TData[] = [];
    for (const page of data.pages) {
      for (const item of page) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          items.push(item);
        }
      }
    }
    return items;
  }, [data?.pages]);

  // @contract Phased refetch: resolves after page 0 (foreground), then silently
  // refreshes remaining cached pages in the background.
  // @sideeffect isRefreshingFirstPage is true only during page 0 fetch.
  // @edge Uses refs for queryFn/queryKey to avoid stale closures in the async chain.
  // @sync Captures serializedKey at call time and compares against serializedKeyRef.current
  // after each await to bail out if the queryKey changed mid-flight (e.g., filter switch).
  // @contract Returns { hasNewData } — true when page 0 item IDs differ from the cached version.
  // @edge setQueryData is deferred to the END of the function so the UI doesn't flash new
  // content while the Refreshing pill is still visible.
  const refetch = useCallback(async (): Promise<{ hasNewData: boolean }> => {
    hasExpandedRef.current = false;
    const capturedKey = serializedKey;
    const totalPages = query.data?.pages?.length ?? /* istanbul ignore next */ 0;
    const oldIds =
      query.data?.pages?.[0]?.map((i) => i.id).join(',') ?? /* istanbul ignore next */ '';

    // Phase 1: foreground — fetch page 0 (data applied at end, not here)
    setIsRefreshingFirstPage(true);
    let freshPage0: TData[] | null = null;
    try {
      freshPage0 = await queryFnRef.current(0, config.initialPageSize);
      /* istanbul ignore next -- race guard: key changed during async fetch */
      if (serializedKeyRef.current !== capturedKey) return { hasNewData: false };
    } finally {
      setIsRefreshingFirstPage(false);
    }

    // @edge Apply data at the end so React 18 batches with caller's setRefreshing(false)
    const hasNewData = freshPage0.map((i) => i.id).join(',') !== oldIds;
    queryClient.setQueryData<InfiniteData<TData[]>>(
      queryKeyRef.current as readonly unknown[],
      (old) => {
        /* istanbul ignore next -- defensive: old is always present during refetch since data was loaded */
        if (!old?.pages) return { pages: [freshPage0!], pageParams: [0] };
        return { ...old, pages: [freshPage0!, ...old.pages.slice(1)] };
      },
    );

    // Phase 2: background — silently refresh remaining cached pages one-by-one
    if (totalPages > 1) {
      void (async () => {
        for (let i = 1; i < totalPages; i++) {
          /* istanbul ignore next -- race guard: key changed during background refresh */
          if (serializedKeyRef.current !== capturedKey) return;
          const offset = getOffset(i, config);
          const limit = getPageSize(i, config);
          try {
            const freshPage = await queryFnRef.current(offset, limit);
            /* istanbul ignore next -- race guard: key changed during background refresh */
            if (serializedKeyRef.current !== capturedKey) return;
            queryClient.setQueryData<InfiniteData<TData[]>>(
              queryKeyRef.current as readonly unknown[],
              (old) => {
                /* istanbul ignore next -- defensive: old always present during background refresh */
                if (!old?.pages || i >= old.pages.length) return old;
                const newPages = [...old.pages];
                newPages[i] = freshPage;
                return { ...old, pages: newPages };
              },
            );
          } catch {
            // @edge Silently ignore background page failures — stale data stays until next refresh
          }
        }
      })();
    }

    return { hasNewData };
  }, [serializedKey, config, queryClient, query.data?.pages?.length, query.data?.pages]);

  // @sideeffect Auto-trigger phased refresh when cache-restored data is detected.
  // _layout.tsx calls markCacheRestored() after PersistQueryClientProvider finishes.
  // When this hook mounts with restored data (isSuccess + not fetching + cache flag),
  // it triggers a phased refresh: page 0 foreground (Refreshing pill), rest silent.
  // @edge Does NOT use invalidateQueries — that would make TanStack auto-refetch ALL
  // pages through its built-in queryFn, which is the slow path we're avoiding.
  // @edge On first load (no cache): isSuccess is false until server responds, and
  // wasCacheRestored() is false (no data to restore), so this never triggers.
  useEffect(() => {
    if (
      wasCacheRestored() &&
      isSuccess &&
      !query.isFetching &&
      !isRefreshingFirstPage &&
      (data?.pages?.length ?? /* istanbul ignore next */ 0) > 0 &&
      !hasTriggeredCacheRefreshRef.current
    ) {
      hasTriggeredCacheRefreshRef.current = true;
      void refetch();
    }
  }, [isSuccess, query.isFetching, isRefreshingFirstPage, data?.pages?.length, refetch]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    fetchStatus: query.fetchStatus,
    error: query.error,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? /* istanbul ignore next */ false,
    fetchNextPage: query.fetchNextPage,
    refetch,
    isRefetching: query.isRefetching,
    isRefreshingFirstPage,
    allItems,
    isBackgroundExpanding,
  };
}
