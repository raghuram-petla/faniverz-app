/**
 * @contract Provides scroll-aware load-more logic with early prefetching.
 * Replaces the manual loadMore callback pattern used across all list screens.
 *
 * @assumes The list component (FlashList/FlatList) supports onEndReached + onEndReachedThreshold.
 * The threshold is computed dynamically from prefetchItemsRemaining / totalItems,
 * converting "5 items remaining" into a ratio that FlashList understands.
 */
import { useCallback, useMemo } from 'react';
import type { SmartPaginationConfig } from '@/constants/paginationConfig';

interface UseSmartPaginationOptions {
  totalItems: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  config: SmartPaginationConfig;
}

interface UseSmartPaginationResult {
  /** Callback for FlashList/FlatList onEndReached */
  handleEndReached: () => void;
  /** Dynamic threshold for FlashList/FlatList onEndReachedThreshold */
  onEndReachedThreshold: number;
}

export function useSmartPagination({
  totalItems,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  config,
}: UseSmartPaginationOptions): UseSmartPaginationResult {
  /**
   * @contract Dynamic threshold: prefetchItemsRemaining / totalItems, clamped [0.2, 0.8].
   * - With 20 items and threshold 5: 5/20 = 0.25 → triggers when 25% from bottom
   * - With 5 items and threshold 5: 5/5 = 1.0 → clamped to 0.8 (triggers at 80%)
   * - Minimum 0.2 prevents triggering too late on long lists
   */
  const onEndReachedThreshold = useMemo(() => {
    if (totalItems === 0) return 0.5;
    const ratio = config.prefetchItemsRemaining / totalItems;
    return Math.min(0.8, Math.max(0.2, ratio));
  }, [totalItems, config.prefetchItemsRemaining]);

  /** @contract Guards against double-fetch: only fetches if there are more pages and not already fetching */
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { handleEndReached, onEndReachedThreshold };
}
