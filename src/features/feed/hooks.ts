import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNewsFeed,
  fetchPersonalizedFeed,
  fetchFeedItemById,
  voteFeedItem,
  removeFeedVote,
  fetchUserVotes,
} from './api';
import { STALE_2M, STALE_5M } from '@/constants/queryConfig';
import { NEWS_FEED_PAGINATION, FEED_PAGINATION } from '@/constants/paginationConfig';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { createOptimisticMutation } from './optimisticMutationFactory';
import type { FeedFilterOption } from '@/types';
import type { NewsFeedItem } from '@shared/types';

// @invariant: FEED_QUERY_KEYS must list every top-level feed query key used in this file. The vote mutations use this array to cancel/rollback/invalidate ALL feed caches. If a new feed query key is added (e.g., 'trending-feed') but not added here, vote optimistic updates will miss that cache entirely.
const FEED_QUERY_KEYS = ['news-feed', 'personalized-feed'] as const;

// @contract: Uses smart pagination — loads 5 items initially for instant display,
// then background-expands to 15 more. Smart prefetch threshold triggers next page
// when 5 items remain unseen.
export function useNewsFeed(filter?: FeedFilterOption) {
  return useSmartInfiniteQuery<NewsFeedItem>({
    queryKey: ['news-feed', filter],
    queryFn: (offset, limit) => fetchNewsFeed(filter, offset, limit),
    config: NEWS_FEED_PAGINATION,
    staleTime: STALE_5M,
  });
}

// @coupling: fetchPersonalizedFeed calls the Supabase RPC 'get_personalized_feed' which scores items based on user's watchlist, favorite_actors, and watched platforms. Personalization is entirely server-side — the hook just passes userId. If the RPC function is dropped/renamed, this fails silently with an empty feed (RPC errors are thrown but the scoring logic is invisible to the client).
// @edge: when userId is null (logged-out user), fetchPersonalizedFeed still runs with p_user_id=null — the RPC handles this by returning unpersonalized results (score = 0 for personalization component). So this works for anonymous users but returns chronological-ish order, not truly "personalized".
export function usePersonalizedFeed(filter: FeedFilterOption = 'all') {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useSmartInfiniteQuery<NewsFeedItem>({
    queryKey: ['personalized-feed', filter, userId],
    queryFn: (offset, limit) => fetchPersonalizedFeed(userId, filter, offset, limit),
    config: FEED_PAGINATION,
    staleTime: STALE_5M,
    // @sideeffect On cold launch, the feed fires immediately with userId=null (unpersonalized).
    // When auth resolves (~200ms later), the key changes to include the real userId.
    // keepPreviousData shows the unpersonalized feed while personalized results load,
    // preventing a skeleton flash. First paint stays at ~100ms.
    keepPreviousData: true,
  });
}

export function useFeedItem(id: string) {
  return useQuery({
    queryKey: ['feed-item', id],
    queryFn: () => fetchFeedItemById(id),
    enabled: !!id,
    staleTime: STALE_5M,
  });
}

// @sideeffect: vote counts are maintained BOTH optimistically in the client cache AND by a DB trigger (trg_feed_vote_count in personalized_feed migration). The upsert in voteFeedItem fires the trigger which increments/decrements news_feed.upvote_count. After onSettled invalidation, the server value overwrites the optimistic one. Between optimistic update and server response (~1-2s), counts may be off by 1 if another user votes simultaneously.
// @assumes: previousVote is passed by the caller from useUserVotes data — if the caller passes the wrong previousVote (e.g., cache was stale), the optimistic count adjustment will be wrong (e.g., decrementing upvote when user hadn't upvoted). The onSettled invalidation self-heals this.
// @edge: the optimistic update iterates ALL cached feed pages across BOTH 'news-feed' and 'personalized-feed' queries. For large caches (many filter variations x many pages), this is O(n*m) synchronous work on the JS thread during onMutate.
// @coupling: uses createOptimisticMutation for the standard cancel/snapshot/update/rollback/invalidate lifecycle. The secondaryQueryKey 'feed-votes' is handled separately via a second factory call because it has a different data shape (Record vs paginated pages).
export function useVoteFeedItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  type FeedVars = {
    feedItemId: string;
    voteType: 'up' | 'down';
    previousVote?: 'up' | 'down' | null;
  };
  type FeedPages = { pages: NewsFeedItem[][] };
  type VoteMap = Record<string, 'up' | 'down'>;

  // @sync: primary lifecycle handles feed page caches; secondary handles flat vote-map cache
  const feedHandlers = createOptimisticMutation<FeedVars, FeedPages>(queryClient, {
    queryKeys: FEED_QUERY_KEYS,
    primaryUpdater: (old, { feedItemId, voteType, previousVote }) => {
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
    },
  });

  // @sync: also optimistically update feed-votes cache so vote icon state changes instantly
  const voteHandlers = createOptimisticMutation<FeedVars, VoteMap>(queryClient, {
    queryKeys: ['feed-votes'] as const,
    primaryUpdater: (old, { feedItemId, voteType }) => ({ ...old, [feedItemId]: voteType }),
    onError: () => Alert.alert(i18n.t('common.error'), i18n.t('common.failedToVote')),
  });

  return useMutation({
    mutationFn: ({ feedItemId, voteType }: FeedVars) => {
      if (!user?.id) throw new Error('Must be logged in to vote');
      return voteFeedItem(feedItemId, user.id, voteType);
    },
    onMutate: async (variables) => {
      const feedCtx = await feedHandlers.onMutate!(variables);
      const voteCtx = await voteHandlers.onMutate!(variables);
      return { feedCtx, voteCtx };
    },
    onError: (err, vars, context) => {
      feedHandlers.onError!(err as Error, vars, context?.feedCtx);
      voteHandlers.onError!(err as Error, vars, context?.voteCtx);
    },
    onSettled: () => {
      feedHandlers.onSettled!();
      voteHandlers.onSettled!();
    },
  });
}

// @sync: mirrors the same optimistic update pattern as useVoteFeedItem above. Both must iterate the same FEED_QUERY_KEYS and use the same cache structure assumption ({ pages: NewsFeedItem[][] }). If one is updated to handle a new cache shape (e.g., adding cursors), the other must match.
// @edge: if the delete fails (e.g., RLS violation because user_id doesn't match auth.uid()), the rollback restores old data and an error Alert is shown.
// @coupling: uses createOptimisticMutation — see useVoteFeedItem for the dual-factory pattern rationale.
export function useRemoveFeedVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  type FeedVars = { feedItemId: string; previousVote?: 'up' | 'down' | null };
  type FeedPages = { pages: NewsFeedItem[][] };
  type VoteMap = Record<string, 'up' | 'down'>;

  const feedHandlers = createOptimisticMutation<FeedVars, FeedPages>(queryClient, {
    queryKeys: FEED_QUERY_KEYS,
    primaryUpdater: (old, { feedItemId, previousVote }) => ({
      ...old,
      pages: old.pages.map((page) =>
        page.map((item) => {
          if (item.id !== feedItemId) return item;
          return {
            ...item,
            upvote_count:
              previousVote === 'up' ? Math.max(0, item.upvote_count - 1) : item.upvote_count,
            downvote_count:
              previousVote === 'down' ? Math.max(0, item.downvote_count - 1) : item.downvote_count,
          };
        }),
      ),
    }),
  });

  // @sync: also optimistically remove from feed-votes cache so vote icon state changes instantly
  const voteHandlers = createOptimisticMutation<FeedVars, VoteMap>(queryClient, {
    queryKeys: ['feed-votes'] as const,
    primaryUpdater: (old, { feedItemId }) => {
      const updated = { ...old };
      delete updated[feedItemId];
      return updated;
    },
    onError: () => Alert.alert(i18n.t('common.error'), i18n.t('common.failedToVote')),
  });

  return useMutation({
    mutationFn: ({ feedItemId }: FeedVars) => {
      if (!user?.id) throw new Error('Must be logged in');
      return removeFeedVote(feedItemId, user.id);
    },
    onMutate: async (variables) => {
      const feedCtx = await feedHandlers.onMutate!(variables);
      const voteCtx = await voteHandlers.onMutate!(variables);
      return { feedCtx, voteCtx };
    },
    onError: (err, vars, context) => {
      feedHandlers.onError!(err as Error, vars, context?.feedCtx);
      voteHandlers.onError!(err as Error, vars, context?.voteCtx);
    },
    onSettled: () => {
      feedHandlers.onSettled!();
      voteHandlers.onSettled!();
    },
  });
}

// @invariant: query key uses sorted feedItemIds to prevent redundant refetches when array order changes.
// @coupling: the returned Record<string, 'up' | 'down'> is used by FeedCard components to pass previousVote.
export function useUserVotes(feedItemIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;
  // @sync: JSON key stabilizes the array reference so useMemo only recomputes when IDs actually change
  const idsKey = [...feedItemIds].sort().join(',');
  const sortedIds = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);

  return useQuery({
    queryKey: ['feed-votes', userId, sortedIds],
    // @sync: must use sortedIds (not feedItemIds) to match the sorted queryKey and avoid stale-closure mismatches
    queryFn: () => fetchUserVotes(userId ?? /* istanbul ignore next */ '', sortedIds),
    enabled: !!userId && sortedIds.length > 0,
    staleTime: STALE_2M,
  });
}
