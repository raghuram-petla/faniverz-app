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
import { useAuth } from '@/features/auth/providers/AuthProvider';
import type { FeedFilterOption } from '@/types';
import type { NewsFeedItem } from '@shared/types';

const PAGE_SIZE = 15;

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
      await queryClient.cancelQueries({ queryKey: ['personalized-feed'] });
      const previousFeedData: {
        queryKey: readonly unknown[];
        data: { pages: NewsFeedItem[][] };
      }[] = [];
      queryClient
        .getQueriesData<{ pages: NewsFeedItem[][] }>({ queryKey: ['personalized-feed'] })
        .forEach(([queryKey, data]) => {
          if (data) previousFeedData.push({ queryKey, data });
        });
      queryClient.setQueriesData<{ pages: NewsFeedItem[][] }>(
        { queryKey: ['personalized-feed'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((item) => {
                if (item.id !== feedItemId) return item;
                let { upvote_count, downvote_count } = item;
                // Remove previous vote if switching
                if (previousVote === 'up') upvote_count--;
                if (previousVote === 'down') downvote_count--;
                // Apply new vote
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
      );
      return { previousFeedData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeedData) {
        for (const { queryKey, data } of context.previousFeedData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
      queryClient.invalidateQueries({ queryKey: ['feed-votes'] });
    },
  });
}

export function useRemoveFeedVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ feedItemId }: { feedItemId: string; previousVote?: 'up' | 'down' | null }) => {
      if (!user?.id) throw new Error('Must be logged in');
      return removeFeedVote(feedItemId, user.id);
    },
    onMutate: async ({ feedItemId, previousVote }) => {
      await queryClient.cancelQueries({ queryKey: ['personalized-feed'] });
      const previousFeedData: {
        queryKey: readonly unknown[];
        data: { pages: NewsFeedItem[][] };
      }[] = [];
      queryClient
        .getQueriesData<{ pages: NewsFeedItem[][] }>({ queryKey: ['personalized-feed'] })
        .forEach(([queryKey, data]) => {
          if (data) previousFeedData.push({ queryKey, data });
        });
      queryClient.setQueriesData<{ pages: NewsFeedItem[][] }>(
        { queryKey: ['personalized-feed'] },
        (old) => {
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
        },
      );
      return { previousFeedData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeedData) {
        for (const { queryKey, data } of context.previousFeedData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
      queryClient.invalidateQueries({ queryKey: ['feed-votes'] });
    },
  });
}

export function useUserVotes(feedItemIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['feed-votes', userId, feedItemIds],
    queryFn: () => fetchUserVotes(userId ?? '', feedItemIds),
    enabled: !!userId && feedItemIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}
