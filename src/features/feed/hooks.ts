import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchNewsFeed, fetchFeaturedFeedItems } from './api';
import type { FeedFilterOption } from '@/types';

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
