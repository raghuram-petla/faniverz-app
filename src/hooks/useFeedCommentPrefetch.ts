/**
 * @contract Composes comment prefetching and view tracking for feed FlashLists.
 * Returns a single viewabilityConfig and composed onViewableItemsChanged callback
 * that handles both comment prefetching and view count tracking.
 *
 * @coupling usePrefetchOnVisibility (comment prefetching) + useTrackFeedViews (view tracking)
 */
import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { ViewToken, ViewabilityConfig } from 'react-native';
import { fetchComments } from '@/features/feed/commentsApi';
import { usePrefetchOnVisibility } from '@/hooks/usePrefetchOnVisibility';
import { useTrackFeedViews } from '@/hooks/useTrackFeedViews';
import type { SmartPaginationConfigWithPrefetch } from '@/constants/paginationConfig';
import { COMMENTS_PAGINATION } from '@/constants/paginationConfig';
import type { NewsFeedItem } from '@shared/types';

export interface UseFeedCommentPrefetchOptions {
  config: SmartPaginationConfigWithPrefetch;
  queryClient: QueryClient;
}

export interface UseFeedCommentPrefetchResult {
  /** Stable viewability config for FlashList */
  viewabilityConfig: ViewabilityConfig;
  /** @coupling Composed callback — handles both comment prefetch and view tracking */
  onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  /** Call on pull-to-refresh to clear view tracking dedup set */
  resetViewDedup: () => void;
}

// @invariant queryKeyFactory and queryFn are stable (useCallback with []) to avoid
// re-creating the prefetch callback on every render
const commentKeyFactory = (item: NewsFeedItem) => ['feed-comments', item.id] as const;
const commentPrefetchFn = (item: NewsFeedItem) =>
  fetchComments(item.id, 0, COMMENTS_PAGINATION.initialPageSize);

export function useFeedCommentPrefetch({
  config,
  queryClient,
}: UseFeedCommentPrefetchOptions): UseFeedCommentPrefetchResult {
  const { viewabilityConfig, onViewableItemsChanged: onViewableForPrefetch } =
    usePrefetchOnVisibility<NewsFeedItem>({
      config,
      queryClient,
      queryKeyFactory: commentKeyFactory,
      queryFn: commentPrefetchFn,
    });

  const { onViewableItemsChanged: onViewableForViews, resetDedup: resetViewDedup } =
    useTrackFeedViews();

  // @coupling Compose prefetch + view tracking callbacks for the single FlashList slot
  const composedOnViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[] }) => {
      onViewableForPrefetch(info);
      onViewableForViews(info);
    },
    [onViewableForPrefetch, onViewableForViews],
  );

  return {
    viewabilityConfig,
    onViewableItemsChanged: composedOnViewableItemsChanged,
    resetViewDedup,
  };
}
