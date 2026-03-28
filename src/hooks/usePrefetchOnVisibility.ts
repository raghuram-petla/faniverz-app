/**
 * @contract Prefetches related data when list items become visible in the viewport.
 * Primary use case: prefetch comments for feed items with high comment counts.
 *
 * @coupling Works with FlashList/FlatList's onViewableItemsChanged prop.
 * This is a SEPARATE prop from onScroll — both can coexist without conflict.
 *
 * @assumes Items have an 'id' field for deduplication tracking.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { ViewToken, ViewabilityConfig } from 'react-native';
import type { SmartPaginationConfigWithPrefetch } from '@/constants/paginationConfig';

interface UsePrefetchOnVisibilityOptions<TItem> {
  config: SmartPaginationConfigWithPrefetch;
  queryClient: QueryClient;
  /** Function that creates the query key for prefetching related data */
  queryKeyFactory: (item: TItem) => readonly unknown[];
  /** Function that fetches the related data (first page) */
  queryFn: (item: TItem) => Promise<unknown>;
}

interface UsePrefetchOnVisibilityResult {
  /** Stable viewability config ref for FlashList/FlatList */
  viewabilityConfig: ViewabilityConfig;
  /** Callback for FlashList/FlatList onViewableItemsChanged */
  onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
}

/**
 * @invariant viewabilityConfig must be a stable reference — FlashList throws if it
 * changes between renders. Module-level constant guarantees stability.
 */
const VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 300,
};

export function usePrefetchOnVisibility<TItem extends { id: string }>({
  config,
  queryClient,
  queryKeyFactory,
  queryFn,
}: UsePrefetchOnVisibilityOptions<TItem>): UsePrefetchOnVisibilityResult {
  /** @contract Tracks prefetched item IDs to avoid duplicate prefetch calls */
  const prefetchedRef = useRef(new Set<string>());
  const rafRef = useRef<number | null>(null);

  // @sync Cleanup pending RAF on unmount to prevent stale prefetch calls
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // @sync Clear dedup set when config identity changes (e.g., after pull-to-refresh)
  const configRef = useRef(config);
  useEffect(() => {
    if (configRef.current !== config) {
      configRef.current = config;
      prefetchedRef.current.clear();
    }
  }, [config]);

  /**
   * @sideeffect Prefetches related data for visible items that exceed the count threshold.
   * Throttled via requestAnimationFrame to batch fast-scroll visibility callbacks.
   */
  const onViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[] }) => {
      if (!config.prefetchRelated) return;

      // Cancel pending RAF to only process the latest visibility state
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const { countField, countThreshold } = config.prefetchRelated!;

        for (const viewToken of info.viewableItems) {
          const item = viewToken.item as TItem;
          if (!item?.id) continue;

          // Skip already-prefetched items
          if (prefetchedRef.current.has(item.id)) continue;

          // Check if the item exceeds the count threshold
          const count = (item as Record<string, unknown>)[countField];
          if (typeof count !== 'number' || count <= countThreshold) continue;

          prefetchedRef.current.add(item.id);

          // @sideeffect Prefetch as infinite query so cache shape matches useSmartInfiniteQuery consumers
          queryClient.prefetchInfiniteQuery({
            queryKey: [...queryKeyFactory(item)],
            queryFn: () => queryFn(item),
            initialPageParam: 0,
          });
        }

        rafRef.current = null;
      });
    },
    [config.prefetchRelated, queryClient, queryKeyFactory, queryFn],
  );

  return {
    viewabilityConfig: VIEWABILITY_CONFIG,
    onViewableItemsChanged,
  };
}
