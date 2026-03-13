import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNewsFeed,
  fetchFeaturedFeedItems,
  fetchPersonalizedFeed,
  fetchFeedItemById,
  voteFeedItem,
  removeFeedVote,
  fetchUserVotes,
} from './api';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import type { FeedFilterOption } from '@/types';
import type { NewsFeedItem } from '@shared/types';

const PAGE_SIZE = 15;
// @invariant: FEED_QUERY_KEYS must list every top-level feed query key used in this file. The vote mutations use this array to cancel/rollback/invalidate ALL feed caches. If a new feed query key is added (e.g., 'trending-feed') but not added here, vote optimistic updates will miss that cache entirely.
const FEED_QUERY_KEYS = ['news-feed', 'personalized-feed'] as const;

// @coupling: PAGE_SIZE here (15) must match the PAGE_SIZE in feed/api.ts (also 15). The getNextPageParam logic returns undefined when lastPage.length < PAGE_SIZE. If api.ts PAGE_SIZE changes without updating hooks.ts, infinite scroll will stop prematurely or never stop.
export function useNewsFeed(filter?: FeedFilterOption) {
  return useInfiniteQuery({
    queryKey: ['news-feed', filter],
    queryFn: ({ pageParam }) => fetchNewsFeed(filter, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeaturedFeed() {
  return useQuery({
    queryKey: ['news-feed', 'featured'],
    queryFn: fetchFeaturedFeedItems,
    staleTime: 10 * 60 * 1000,
  });
}

// @coupling: fetchPersonalizedFeed calls the Supabase RPC 'get_personalized_feed' which scores items based on user's watchlist, favorite_actors, and watched platforms. Personalization is entirely server-side — the hook just passes userId. If the RPC function is dropped/renamed, this fails silently with an empty feed (RPC errors are thrown but the scoring logic is invisible to the client).
// @edge: when userId is null (logged-out user), fetchPersonalizedFeed still runs with p_user_id=null — the RPC handles this by returning unpersonalized results (score = 0 for personalization component). So this works for anonymous users but returns chronological-ish order, not truly "personalized".
export function usePersonalizedFeed(filter: FeedFilterOption = 'all') {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useInfiniteQuery({
    queryKey: ['personalized-feed', filter, userId],
    queryFn: ({ pageParam }) => fetchPersonalizedFeed(userId, filter, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeedItem(id: string) {
  return useQuery({
    queryKey: ['feed-item', id],
    queryFn: () => fetchFeedItemById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// @sideeffect: vote counts are maintained BOTH optimistically in the client cache AND by a DB trigger (trg_feed_vote_count in personalized_feed migration). The upsert in voteFeedItem fires the trigger which increments/decrements news_feed.upvote_count. After onSettled invalidation, the server value overwrites the optimistic one. Between optimistic update and server response (~1-2s), counts may be off by 1 if another user votes simultaneously.
// @assumes: previousVote is passed by the caller from useUserVotes data — if the caller passes the wrong previousVote (e.g., cache was stale), the optimistic count adjustment will be wrong (e.g., decrementing upvote when user hadn't upvoted). The onSettled invalidation self-heals this.
// @edge: the optimistic update iterates ALL cached feed pages across BOTH 'news-feed' and 'personalized-feed' queries. For large caches (many filter variations x many pages), this is O(n*m) synchronous work on the JS thread during onMutate.
export function useVoteFeedItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      feedItemId,
      voteType,
    }: {
      feedItemId: string;
      voteType: 'up' | 'down';
      previousVote?: 'up' | 'down' | null;
    }) => {
      if (!user?.id) throw new Error('Must be logged in to vote');
      return voteFeedItem(feedItemId, user.id, voteType);
    },
    onMutate: async ({ feedItemId, voteType, previousVote }) => {
      const previousFeedData: {
        queryKey: readonly unknown[];
        data: { pages: NewsFeedItem[][] };
      }[] = [];
      for (const key of FEED_QUERY_KEYS) {
        await queryClient.cancelQueries({ queryKey: [key] });
        queryClient
          .getQueriesData<{ pages: NewsFeedItem[][] }>({ queryKey: [key] })
          .forEach(([queryKey, data]) => {
            if (data) previousFeedData.push({ queryKey, data });
          });
        queryClient.setQueriesData<{ pages: NewsFeedItem[][] }>({ queryKey: [key] }, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((item) => {
                if (item.id !== feedItemId) return item;
                let { upvote_count, downvote_count } = item;
                if (previousVote === 'up') upvote_count--;
                if (previousVote === 'down') downvote_count--;
                if (voteType === 'up') upvote_count++;
                if (voteType === 'down') downvote_count++;
                return {
                  ...item,
                  upvote_count: Math.max(0, upvote_count),
                  downvote_count: Math.max(0, downvote_count),
                };
              }),
            ),
          };
        });
      }
      return { previousFeedData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeedData) {
        for (const { queryKey, data } of context.previousFeedData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToVote'));
    },
    onSettled: () => {
      for (const key of FEED_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      queryClient.invalidateQueries({ queryKey: ['feed-votes'] });
    },
  });
}

// @sync: mirrors the same optimistic update pattern as useVoteFeedItem above. Both must iterate the same FEED_QUERY_KEYS and use the same cache structure assumption ({ pages: NewsFeedItem[][] }). If one is updated to handle a new cache shape (e.g., adding cursors), the other must match.
// @edge: if the delete fails (e.g., RLS violation because user_id doesn't match auth.uid()), the rollback restores old data and an error Alert is shown.
export function useRemoveFeedVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ feedItemId }: { feedItemId: string; previousVote?: 'up' | 'down' | null }) => {
      if (!user?.id) throw new Error('Must be logged in');
      return removeFeedVote(feedItemId, user.id);
    },
    onMutate: async ({ feedItemId, previousVote }) => {
      const previousFeedData: {
        queryKey: readonly unknown[];
        data: { pages: NewsFeedItem[][] };
      }[] = [];
      for (const key of FEED_QUERY_KEYS) {
        await queryClient.cancelQueries({ queryKey: [key] });
        queryClient
          .getQueriesData<{ pages: NewsFeedItem[][] }>({ queryKey: [key] })
          .forEach(([queryKey, data]) => {
            if (data) previousFeedData.push({ queryKey, data });
          });
        queryClient.setQueriesData<{ pages: NewsFeedItem[][] }>({ queryKey: [key] }, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((item) => {
                if (item.id !== feedItemId) return item;
                return {
                  ...item,
                  upvote_count:
                    previousVote === 'up' ? Math.max(0, item.upvote_count - 1) : item.upvote_count,
                  downvote_count:
                    previousVote === 'down'
                      ? Math.max(0, item.downvote_count - 1)
                      : item.downvote_count,
                };
              }),
            ),
          };
        });
      }
      return { previousFeedData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeedData) {
        for (const { queryKey, data } of context.previousFeedData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToVote'));
    },
    onSettled: () => {
      for (const key of FEED_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      queryClient.invalidateQueries({ queryKey: ['feed-votes'] });
    },
  });
}

// @invariant: query key uses sorted feedItemIds to prevent redundant refetches when array order changes.
// @coupling: the returned Record<string, 'up' | 'down'> is used by FeedCard components to pass previousVote.
export function useUserVotes(feedItemIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;
  const sortedIds = useMemo(() => [...feedItemIds].sort(), [feedItemIds]);

  return useQuery({
    queryKey: ['feed-votes', userId, sortedIds],
    queryFn: () => fetchUserVotes(userId ?? '', feedItemIds),
    enabled: !!userId && feedItemIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}
