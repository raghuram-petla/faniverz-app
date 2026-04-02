/**
 * @contract Shared types for the smart pagination system.
 * Used by useSmartInfiniteQuery, useSmartPagination, usePrefetchOnVisibility, and SmartList.
 */
import type {
  InfiniteData,
  FetchNextPageOptions,
  InfiniteQueryObserverResult,
} from '@tanstack/react-query';
import type { SmartPaginationConfig } from '@/constants/paginationConfig';

/** @contract Return type of useSmartInfiniteQuery — extends standard infinite query result */
export interface SmartInfiniteQueryResult<TData> {
  data: InfiniteData<TData[]> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchStatus: 'fetching' | 'paused' | 'idle';
  fetchNextPage: (
    options?: FetchNextPageOptions,
  ) => Promise<InfiniteQueryObserverResult<InfiniteData<TData[]>, Error>>;
  refetch: () => Promise<unknown>;
  isRefetching: boolean;
  /** All items flattened from all pages, deduplicated by id */
  allItems: TData[];
  /** Whether background expansion is in progress (page 2 auto-loading) */
  isBackgroundExpanding: boolean;
}

/** @contract Options for useSmartInfiniteQuery */
export interface SmartInfiniteQueryOptions<TData> {
  queryKey: readonly unknown[];
  /** Fetch function that receives absolute offset and limit (number of items to fetch) */
  queryFn: (offset: number, limit: number) => Promise<TData[]>;
  config: SmartPaginationConfig;
  staleTime?: number;
  enabled?: boolean;
  /** @sideeffect When true, keeps previous query key's data visible while the new key fetches.
   * Prevents skeleton flash on key changes (e.g., auth resolve changing userId). */
  keepPreviousData?: boolean;
}
