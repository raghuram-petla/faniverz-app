import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { recordFeedViews } from '@/features/feed/viewTrackingApi';
import type { NewsFeedItem } from '@shared/types';

/** @contract Feed query keys that store paginated pages of NewsFeedItem. Must match FEED_QUERY_KEYS in hooks.ts. */
const FEED_LIST_KEYS = ['news-feed', 'personalized-feed'] as const;

/**
 * @sideeffect Records a view when a post detail page opens for an authenticated user.
 * Uses a ref to deduplicate — only fires once per post ID per mount.
 * @sync Optimistically increments view_count in both 'feed-item' and feed list caches
 * so the user sees the updated count without waiting for server round-trip.
 */
export function useRecordPostView(post: NewsFeedItem | null | undefined): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const viewRecordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!post || !user || viewRecordedRef.current === post.id) return;
    viewRecordedRef.current = post.id;
    recordFeedViews([post.id]);

    // @sync: Optimistically increment view_count in feed-item cache
    queryClient.setQueryData<NewsFeedItem>(['feed-item', post.id], (old) => {
      if (!old) return old;
      return { ...old, view_count: old.view_count + 1 };
    });

    // @sync: Optimistically increment view_count in feed list caches
    for (const key of FEED_LIST_KEYS) {
      queryClient.setQueriesData<{ pages: NewsFeedItem[][] }>(
        { queryKey: [key] },
        /* istanbul ignore next */ (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((item) =>
                item.id === post.id ? { ...item, view_count: item.view_count + 1 } : item,
              ),
            ),
          };
        },
      );
    }
  }, [post, user, queryClient]);
}
