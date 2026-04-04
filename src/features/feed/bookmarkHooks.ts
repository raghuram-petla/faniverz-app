import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bookmarkFeedItem,
  unbookmarkFeedItem,
  fetchUserBookmarks,
  fetchBookmarkedFeed,
} from './bookmarkApi';
import { STALE_2M, STALE_5M } from '@/constants/queryConfig';
import { FEED_PAGINATION } from '@/constants/paginationConfig';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import type { NewsFeedItem } from '@shared/types';

// @coupling: bookmark data uses Record<string, true> instead of Set because TanStack Query's
// structuralSharing converts Set to plain objects, breaking .has() calls.
type BookmarkMap = Record<string, true>;

// @invariant: must list every top-level feed query key so bookmark mutations cancel/rollback/invalidate
// ALL feed caches when bookmark_count changes. If a new feed query key is added (e.g., 'trending-feed')
// it must be added here or its bookmark_count will be stale after bookmarking.
const BOOKMARK_FEED_QUERY_KEYS = ['news-feed', 'personalized-feed', 'bookmarked-feed'] as const;

// @coupling: fetchBookmarkedFeed is only called when userId is defined — resolves empty when anonymous
export function useBookmarkedFeed() {
  const { user } = useAuth();
  const userId = user?.id ?? /* istanbul ignore next */ null;

  // @edge: enabled: !!userId prevents query from running for anonymous users — avoids unnecessary cache entries
  return useSmartInfiniteQuery<NewsFeedItem>({
    queryKey: ['bookmarked-feed', userId],
    queryFn: (offset, limit) =>
      userId
        ? fetchBookmarkedFeed(userId, offset, limit)
        : /* istanbul ignore next */ Promise.resolve([]),
    config: FEED_PAGINATION,
    staleTime: STALE_5M,
    enabled: !!userId,
  });
}

// @sideeffect: optimistically increments bookmark_count in all feed page caches and adds
// feedItemId to the feed-bookmarks-set cache so the icon updates instantly.
// DB trigger (trg_feed_bookmark_count) mirrors the INCREMENT on INSERT.
// @assumes: the trigger fires only on the INSERT path of upsert — if a row already exists (user
// already bookmarked), the upsert is a no-op and the trigger does NOT fire a second time.
export function useBookmarkFeedItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ feedItemId }: { feedItemId: string }) => {
      if (!user?.id) throw new Error('Must be logged in to bookmark');
      return bookmarkFeedItem(feedItemId, user.id);
    },
    onMutate: async ({ feedItemId }) => {
      // @sync: capture ALL rollback snapshots BEFORE any setQueriesData calls
      const previousFeedData: {
        queryKey: readonly unknown[];
        data: { pages: NewsFeedItem[][] };
      }[] = [];
      for (const key of BOOKMARK_FEED_QUERY_KEYS) {
        await queryClient.cancelQueries({ queryKey: [key] });
        queryClient
          .getQueriesData<{ pages: NewsFeedItem[][] }>({ queryKey: [key] })
          .forEach(([queryKey, data]) => {
            /* istanbul ignore next -- defensive: getQueriesData returns undefined when no cache */
            if (data) previousFeedData.push({ queryKey, data });
          });
      }
      for (const key of BOOKMARK_FEED_QUERY_KEYS) {
        queryClient.setQueriesData<{ pages: NewsFeedItem[][] }>({ queryKey: [key] }, (old) => {
          /* istanbul ignore next -- defensive: setQueriesData updater receives undefined for empty cache */
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((item) =>
                item.id !== feedItemId
                  ? item
                  : { ...item, bookmark_count: item.bookmark_count + 1 },
              ),
            ),
          };
        });
      }
      // @sync: optimistically update feed-bookmarks-set so icon state changes instantly
      await queryClient.cancelQueries({ queryKey: ['feed-bookmarks-set'] });
      const previousBookmarkData: { queryKey: readonly unknown[]; data: BookmarkMap }[] = [];
      queryClient
        .getQueriesData<BookmarkMap>({ queryKey: ['feed-bookmarks-set'] })
        .forEach(([queryKey, data]) => {
          /* istanbul ignore next -- defensive: getQueriesData returns undefined when no cache */
          if (data) previousBookmarkData.push({ queryKey, data });
        });
      queryClient.setQueriesData<BookmarkMap>({ queryKey: ['feed-bookmarks-set'] }, (old) => {
        return { ...(old ?? /* istanbul ignore next */ {}), [feedItemId]: true as const };
      });
      return { previousFeedData, previousBookmarkData };
    },
    onError: (_err, _vars, context) => {
      /* istanbul ignore next -- context is always defined when onMutate returns successfully */
      if (context?.previousFeedData) {
        for (const { queryKey, data } of context.previousFeedData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      /* istanbul ignore next -- context is always defined when onMutate returns successfully */
      if (context?.previousBookmarkData) {
        for (const { queryKey, data } of context.previousBookmarkData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToBookmark'));
    },
    onSettled: () => {
      for (const key of BOOKMARK_FEED_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      queryClient.invalidateQueries({ queryKey: ['feed-bookmarks-set'] });
    },
  });
}

// @sync: mirrors the same optimistic update pattern as useBookmarkFeedItem above.
// Decrements bookmark_count (matching DB trigger on DELETE) and removes feedItemId from record.
export function useUnbookmarkFeedItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ feedItemId }: { feedItemId: string }) => {
      if (!user?.id) throw new Error('Must be logged in');
      return unbookmarkFeedItem(feedItemId, user.id);
    },
    onMutate: async ({ feedItemId }) => {
      const previousFeedData: {
        queryKey: readonly unknown[];
        data: { pages: NewsFeedItem[][] };
      }[] = [];
      for (const key of BOOKMARK_FEED_QUERY_KEYS) {
        await queryClient.cancelQueries({ queryKey: [key] });
        queryClient
          .getQueriesData<{ pages: NewsFeedItem[][] }>({ queryKey: [key] })
          .forEach(([queryKey, data]) => {
            /* istanbul ignore next -- defensive: getQueriesData returns undefined when no cache */
            if (data) previousFeedData.push({ queryKey, data });
          });
      }
      for (const key of BOOKMARK_FEED_QUERY_KEYS) {
        queryClient.setQueriesData<{ pages: NewsFeedItem[][] }>({ queryKey: [key] }, (old) => {
          /* istanbul ignore next -- defensive: setQueriesData updater receives undefined for empty cache */
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((item) =>
                item.id !== feedItemId
                  ? item
                  : { ...item, bookmark_count: Math.max(0, item.bookmark_count - 1) },
              ),
            ),
          };
        });
      }
      await queryClient.cancelQueries({ queryKey: ['feed-bookmarks-set'] });
      const previousBookmarkData: { queryKey: readonly unknown[]; data: BookmarkMap }[] = [];
      queryClient
        .getQueriesData<BookmarkMap>({ queryKey: ['feed-bookmarks-set'] })
        .forEach(([queryKey, data]) => {
          /* istanbul ignore next -- defensive: getQueriesData returns undefined when no cache */
          if (data) previousBookmarkData.push({ queryKey, data });
        });
      queryClient.setQueriesData<BookmarkMap>({ queryKey: ['feed-bookmarks-set'] }, (old) => {
        /* istanbul ignore next -- defensive: old is undefined when no bookmark cache exists */
        if (!old) return {};
        const { [feedItemId]: _, ...rest } = old;
        return rest;
      });
      return { previousFeedData, previousBookmarkData };
    },
    onError: (_err, _vars, context) => {
      /* istanbul ignore next -- context is always defined when onMutate returns successfully */
      if (context?.previousFeedData) {
        for (const { queryKey, data } of context.previousFeedData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      /* istanbul ignore next -- context is always defined when onMutate returns successfully */
      if (context?.previousBookmarkData) {
        for (const { queryKey, data } of context.previousBookmarkData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToBookmark'));
    },
    onSettled: () => {
      for (const key of BOOKMARK_FEED_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      queryClient.invalidateQueries({ queryKey: ['feed-bookmarks-set'] });
    },
  });
}

// @invariant: query key uses sorted feedItemIds to prevent redundant refetches when array order changes.
// @coupling: returned Record<string, true> drives isBookmarked per FeedCard. Optimistic updates above
// keep this cache in sync so icon state changes before the server confirms.
export function useUserBookmarks(feedItemIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;
  const idsKey = [...feedItemIds].sort().join(',');
  const sortedIds = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);

  return useQuery({
    queryKey: ['feed-bookmarks-set', userId, sortedIds],
    queryFn: () => fetchUserBookmarks(userId ?? /* istanbul ignore next */ '', sortedIds),
    enabled: !!userId && sortedIds.length > 0,
    staleTime: STALE_2M,
  });
}
