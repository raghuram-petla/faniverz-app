/**
 * @contract Wraps useInfiniteQuery with two-phase loading:
 * 1. Page 0 uses initialPageSize (small, for instant first paint)
 * 2. Page 1+ uses expandedPageSize
 * 3. When backgroundExpand is true, auto-fetches page 2 after page 1 settles
 *
 * @coupling Offset calculation for Supabase .range():
 *   page 0: offset=0, limit=initialPageSize
 *   page N: offset=initialPageSize + (N-1) * expandedPageSize, limit=expandedPageSize
 *   The queryFn receives (offset, limit) — API functions use these for .range(offset, offset+limit-1)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
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
  const [isBackgroundExpanding, setIsBackgroundExpanding] = useState(false);
  const hasExpandedRef = useRef(false);
  const serializedKey = JSON.stringify(queryKey);

  // @sync Reset background expansion state when queryKey changes (e.g., filter switch)
  useEffect(() => {
    hasExpandedRef.current = false;
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

  // @assumes query.refetch is stable across renders (TanStack Query v5 guarantees this)
  const refetch = useCallback(() => {
    hasExpandedRef.current = false;
    return query.refetch();
  }, [query.refetch]);

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
    allItems,
    isBackgroundExpanding,
  };
}
