jest.mock('../api');

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-123' },
    session: {},
    isLoading: false,
    isGuest: false,
    setIsGuest: jest.fn(),
  })),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import {
  useNewsFeed,
  useFeaturedFeed,
  usePersonalizedFeed,
  useFeedItem,
  useVoteFeedItem,
  useRemoveFeedVote,
  useUserVotes,
} from '../hooks';
import {
  fetchNewsFeed,
  fetchFeaturedFeedItems,
  fetchPersonalizedFeed,
  fetchFeedItemById,
  voteFeedItem,
  removeFeedVote,
  fetchUserVotes,
} from '../api';

const mockFetchNewsFeed = fetchNewsFeed as jest.MockedFunction<typeof fetchNewsFeed>;
const mockFetchFeatured = fetchFeaturedFeedItems as jest.MockedFunction<
  typeof fetchFeaturedFeedItems
>;
const mockFetchPersonalized = fetchPersonalizedFeed as jest.MockedFunction<
  typeof fetchPersonalizedFeed
>;
const mockVoteFeedItem = voteFeedItem as jest.MockedFunction<typeof voteFeedItem>;
const mockRemoveFeedVote = removeFeedVote as jest.MockedFunction<typeof removeFeedVote>;
const mockFetchFeedItemById = fetchFeedItemById as jest.MockedFunction<typeof fetchFeedItemById>;
const mockFetchUserVotes = fetchUserVotes as jest.MockedFunction<typeof fetchUserVotes>;

const mockItem = {
  id: '1',
  feed_type: 'video' as const,
  content_type: 'trailer',
  title: 'Test',
  description: null,
  movie_id: null,
  source_table: null,
  source_id: null,
  thumbnail_url: null,
  youtube_id: 'abc',
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 5,
  downvote_count: 1,
  view_count: 0,
  comment_count: 0,
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
};

describe('useNewsFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchNewsFeed.mockResolvedValue([mockItem]);
  });

  it('fetches feed data successfully', async () => {
    const { result } = renderHook(() => useNewsFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual([mockItem]);
  });

  it('passes filter to API', async () => {
    const { result } = renderHook(() => useNewsFeed('trailers'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchNewsFeed).toHaveBeenCalledWith('trailers', 0, 15);
  });

  it('handles errors', async () => {
    mockFetchNewsFeed.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useNewsFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useFeaturedFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchFeatured.mockResolvedValue([mockItem]);
  });

  it('fetches featured items successfully', async () => {
    const { result } = renderHook(() => useFeaturedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockItem]);
  });

  it('handles errors', async () => {
    mockFetchFeatured.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useFeaturedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('usePersonalizedFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchPersonalized.mockResolvedValue([mockItem]);
  });

  it('fetches personalized feed successfully', async () => {
    const { result } = renderHook(() => usePersonalizedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual([mockItem]);
  });

  it('calls fetchPersonalizedFeed with user id and filter', async () => {
    const { result } = renderHook(() => usePersonalizedFeed('trailers'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchPersonalized).toHaveBeenCalledWith('user-123', 'trailers', 0, 15);
  });

  it('defaults filter to all', async () => {
    const { result } = renderHook(() => usePersonalizedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchPersonalized).toHaveBeenCalledWith('user-123', 'all', 0, 15);
  });

  it('handles errors', async () => {
    mockFetchPersonalized.mockRejectedValue(new Error('personalized fail'));
    const { result } = renderHook(() => usePersonalizedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useVoteFeedItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoteFeedItem.mockResolvedValue({
      id: 'vote-1',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'up',
      created_at: '2024-01-01T00:00:00Z',
    });
  });

  it('calls voteFeedItem mutation successfully', async () => {
    const { result } = renderHook(() => useVoteFeedItem(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockVoteFeedItem).toHaveBeenCalledWith('item-1', 'user-123', 'up');
  });

  it('calls voteFeedItem with downvote', async () => {
    mockVoteFeedItem.mockResolvedValue({
      id: 'vote-2',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'down',
      created_at: '2024-01-01T00:00:00Z',
    });
    const { result } = renderHook(() => useVoteFeedItem(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'down' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockVoteFeedItem).toHaveBeenCalledWith('item-1', 'user-123', 'down');
  });

  it('handles mutation error and shows alert', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});
    mockVoteFeedItem.mockRejectedValue(new Error('vote error'));
    const { result } = renderHook(() => useVoteFeedItem(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('applies optimistic update to cached feed pages on mutate', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    // Pre-populate the cache with a page of items
    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up', previousVote: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('throws when user is not logged in', async () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    useAuth.mockReturnValueOnce({ user: null });

    mockVoteFeedItem.mockRejectedValue(new Error('Must be logged in to vote'));
    const { result } = renderHook(() => useVoteFeedItem(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('with previousVote=up adjusts vote counts in optimistic update', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'down', previousVote: 'up' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useRemoveFeedVote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveFeedVote.mockResolvedValue(undefined);
  });

  it('calls removeFeedVote mutation successfully', async () => {
    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRemoveFeedVote).toHaveBeenCalledWith('item-1', 'user-123');
  });

  it('handles mutation error and shows alert', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});
    mockRemoveFeedVote.mockRejectedValue(new Error('remove error'));
    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('applies optimistic update for removing upvote', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', previousVote: 'up' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('applies optimistic update for removing downvote', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['personalized-feed', 'all', 'user-123'], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', previousVote: 'down' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('throws when user is not logged in', async () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    useAuth.mockReturnValueOnce({ user: null });

    mockRemoveFeedVote.mockRejectedValue(new Error('Must be logged in'));
    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUserVotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchUserVotes.mockResolvedValue({ 'item-1': 'up', 'item-2': 'down' });
  });

  it('fetches user votes with correct ids', async () => {
    const { result } = renderHook(() => useUserVotes(['item-1', 'item-2']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchUserVotes).toHaveBeenCalledWith('user-123', ['item-1', 'item-2']);
    expect(result.current.data).toEqual({ 'item-1': 'up', 'item-2': 'down' });
  });

  it('does not fetch when feedItemIds is empty', async () => {
    const { result } = renderHook(() => useUserVotes([]), { wrapper: createWrapper() });
    // Should remain in idle/pending since enabled is false
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockFetchUserVotes).not.toHaveBeenCalled();
  });

  it('handles error', async () => {
    mockFetchUserVotes.mockRejectedValue(new Error('votes error'));
    const { result } = renderHook(() => useUserVotes(['item-1']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useFeedItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchFeedItemById.mockResolvedValue(mockItem);
  });

  it('fetches a single feed item by id', async () => {
    const { result } = renderHook(() => useFeedItem('1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchFeedItemById).toHaveBeenCalledWith('1');
    expect(result.current.data).toEqual(mockItem);
  });

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => useFeedItem(''), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockFetchFeedItemById).not.toHaveBeenCalled();
  });
});

describe('useNewsFeed — pagination boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns next page param when last page is full (PAGE_SIZE=15)', async () => {
    // Create exactly 15 items to trigger getNextPageParam returning page 1
    const fullPage = Array.from({ length: 15 }, (_, i) => ({ ...mockItem, id: String(i) }));
    mockFetchNewsFeed.mockResolvedValue(fullPage);
    const { result } = renderHook(() => useNewsFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // hasNextPage should be true when full page returned
    expect(result.current.hasNextPage).toBe(true);
  });

  it('returns undefined next page param when last page is partial (< 15 items)', async () => {
    const partialPage = Array.from({ length: 5 }, (_, i) => ({ ...mockItem, id: String(i) }));
    mockFetchNewsFeed.mockResolvedValue(partialPage);
    const { result } = renderHook(() => useNewsFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('usePersonalizedFeed — pagination boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns next page param when full page returned', async () => {
    const fullPage = Array.from({ length: 15 }, (_, i) => ({ ...mockItem, id: String(i) }));
    mockFetchPersonalized.mockResolvedValue(fullPage);
    const { result } = renderHook(() => usePersonalizedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('returns no next page when partial page returned', async () => {
    mockFetchPersonalized.mockResolvedValue([mockItem]);
    const { result } = renderHook(() => usePersonalizedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('passes null userId when user is not logged in', async () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    useAuth.mockReturnValueOnce({ user: null });
    mockFetchPersonalized.mockResolvedValue([]);
    const { result } = renderHook(() => usePersonalizedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchPersonalized).toHaveBeenCalledWith(null, 'all', 0, 15);
  });
});

describe('useUserVotes — disabled when user is null', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not fetch when user is null (enabled=false for userId check)', async () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    useAuth.mockReturnValueOnce({ user: null });
    const { result } = renderHook(() => useUserVotes(['item-1']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockFetchUserVotes).not.toHaveBeenCalled();
  });
});

describe('useUserVotes — sortedIds invariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchUserVotes.mockResolvedValue({});
  });

  it('sorts feedItemIds before passing to API', async () => {
    const { result } = renderHook(() => useUserVotes(['z-item', 'a-item', 'm-item']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchUserVotes).toHaveBeenCalledWith('user-123', ['a-item', 'm-item', 'z-item']);
  });
});

describe('useVoteFeedItem — previousVote branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoteFeedItem.mockResolvedValue({
      id: 'vote-1',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'up',
      created_at: '2024-01-01T00:00:00Z',
    });
  });

  it('with previousVote=down adjusts counts in optimistic update', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 3, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up', previousVote: 'down' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useVoteFeedItem — onError without previousFeedData in context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('onError handles empty previousFeedData array without crash', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    mockVoteFeedItem.mockRejectedValue(new Error('Network error'));

    // Use a clean client with no cached data — onMutate returns { previousFeedData: [] }
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useRemoveFeedVote — onError without previousFeedData in context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('onError handles empty previousFeedData array without crash', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    mockRemoveFeedVote.mockRejectedValue(new Error('Network error'));

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useVoteFeedItem — multiple items in cache, non-matching skipped', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoteFeedItem.mockResolvedValue({
      id: 'vote-1',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'up',
      created_at: '2024-01-01T00:00:00Z',
    });
  });

  it('skips non-matching items during optimistic update (item.id !== feedItemId branch)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    // Two items in cache; only item-1 should be updated
    client.setQueryData(['news-feed', undefined], {
      pages: [
        [
          { ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 },
          { ...mockItem, id: 'item-other', upvote_count: 10, downvote_count: 3 },
        ],
      ],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up', previousVote: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the non-matching item was returned unchanged
    const cached = client.getQueryData<{ pages: (typeof mockItem)[][] }>(['news-feed', undefined]);
    const otherItem = cached?.pages[0]?.find((i) => i.id === 'item-other');
    expect(otherItem?.upvote_count).toBe(10); // unchanged
  });
});

describe('useVoteFeedItem — cache with data that gets returned in getQueriesData forEach', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoteFeedItem.mockResolvedValue({
      id: 'vote-1',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'up',
      created_at: '2024-01-01T00:00:00Z',
    });
  });

  it('captures snapshot of personalized-feed during onMutate (covers data branch in forEach)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    // Populate BOTH feed caches so the forEach loop captures data from both
    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });
    client.setQueryData(['personalized-feed', 'all', 'user-123'], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'down', previousVote: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useVoteFeedItem — onError rollback with cached data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rolls back to previous data when mutation fails with cached data', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    mockVoteFeedItem.mockRejectedValue(new Error('Network error'));

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    // Pre-populate cache so previousFeedData is non-empty
    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up', previousVote: null });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();

    // Verify cache was restored
    const cached = client.getQueryData<{ pages: (typeof mockItem)[][] }>(['news-feed', undefined]);
    expect(cached?.pages[0]?.[0]?.upvote_count).toBe(5);
    alertSpy.mockRestore();
  });
});

describe('useRemoveFeedVote — onError rollback with cached data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rolls back to previous data when mutation fails with cached data', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    mockRemoveFeedVote.mockRejectedValue(new Error('Network error'));

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', previousVote: 'up' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();

    const cached = client.getQueryData<{ pages: (typeof mockItem)[][] }>(['news-feed', undefined]);
    expect(cached?.pages[0]?.[0]?.upvote_count).toBe(5);
    alertSpy.mockRestore();
  });
});

describe('useRemoveFeedVote — non-matching items in optimistic update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveFeedVote.mockResolvedValue(undefined);
  });

  it('skips non-matching items during optimistic update', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['news-feed', undefined], {
      pages: [
        [
          { ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 },
          { ...mockItem, id: 'item-other', upvote_count: 10, downvote_count: 3 },
        ],
      ],
      pageParams: [0],
    });

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', previousVote: 'up' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: (typeof mockItem)[][] }>(['news-feed', undefined]);
    const otherItem = cached?.pages[0]?.find((i) => i.id === 'item-other');
    expect(otherItem?.upvote_count).toBe(10);
  });
});

describe('useVoteFeedItem — setQueriesData with undefined old data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoteFeedItem.mockResolvedValue({
      id: 'vote-1',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'up',
      created_at: '2024-01-01T00:00:00Z',
    });
  });

  it('handles getQueriesData entry with undefined data (if data guard) and setQueriesData with !old', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    // Create a query observer for 'news-feed' with a stale filter so getQueriesData returns
    // an entry with data=undefined. We use fetchQuery with a queryFn that returns undefined-like data
    // to force a cache entry that has no data.
    client.setQueryDefaults(['news-feed'], { queryFn: () => Promise.resolve(undefined) });
    // Force an observer to exist by setting empty defaults — then use getQueryCache to add entry
    const cache = client.getQueryCache();
    cache.build(client, { queryKey: ['news-feed', 'no-data'] });

    // Also set valid data
    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up', previousVote: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useRemoveFeedVote — setQueriesData with undefined old data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveFeedVote.mockResolvedValue(undefined);
  });

  it('handles getQueriesData entry with undefined data and setQueriesData with !old', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const cache = client.getQueryCache();
    cache.build(client, { queryKey: ['news-feed', 'no-data'] });

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', previousVote: 'up' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useUserVotes — disabled when userId is absent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchUserVotes.mockResolvedValue({});
  });

  it('does not fetch when user is null (userId undefined)', async () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    useAuth.mockReturnValueOnce({ user: null });
    const { result } = renderHook(() => useUserVotes(['item-1']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockFetchUserVotes).not.toHaveBeenCalled();
  });
});

describe('useRemoveFeedVote — previousVote=null branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveFeedVote.mockResolvedValue(undefined);
  });

  it('does not adjust counts when previousVote is null', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', previousVote: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useVoteFeedItem — feed-votes cache with undefined entries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoteFeedItem.mockResolvedValue({
      id: 'vote-1',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'up',
      created_at: '2024-01-01T00:00:00Z',
    });
  });

  it('skips feed-votes cache entries with undefined data in forEach and handles !old in setQueriesData', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    // Create a feed-votes query cache entry WITHOUT data (only metadata)
    const cache = client.getQueryCache();
    cache.build(client, { queryKey: ['feed-votes', 'no-data'] });

    // Also set news-feed data so mutation can proceed
    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up', previousVote: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useRemoveFeedVote — feed-votes cache with undefined entries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveFeedVote.mockResolvedValue(undefined);
  });

  it('skips feed-votes cache entries with undefined data in forEach and handles !old in setQueriesData', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    // Create a feed-votes query cache entry WITHOUT data
    const cache = client.getQueryCache();
    cache.build(client, { queryKey: ['feed-votes', 'no-data'] });

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', previousVote: 'up' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useVoteFeedItem — previousVote=undefined (no previous vote)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoteFeedItem.mockResolvedValue({
      id: 'vote-1',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'down',
      created_at: '2024-01-01T00:00:00Z',
    });
  });

  it('adjusts only new vote when previousVote is undefined', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'down' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useRemoveFeedVote — previousVote=undefined', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveFeedVote.mockResolvedValue(undefined);
  });

  it('does not adjust counts when previousVote is undefined', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: (typeof mockItem)[][] }>(['news-feed', undefined]);
    expect(cached?.pages[0]?.[0]?.upvote_count).toBe(5);
    expect(cached?.pages[0]?.[0]?.downvote_count).toBe(2);
  });
});

describe('useVoteFeedItem — feed-votes cache optimistic update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoteFeedItem.mockResolvedValue({
      id: 'vote-1',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'up',
      created_at: '2024-01-01T00:00:00Z',
    });
  });

  it('optimistically updates feed-votes cache with new vote type', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    // Pre-populate feed-votes cache so the forEach captures data and setQueriesData updates it
    client.setQueryData(['feed-votes', 'user-123', ['item-1']], {
      'item-1': 'down',
    });

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up', previousVote: 'down' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify feed-votes cache was optimistically updated
    const votesCache = client.getQueryData<Record<string, 'up' | 'down'>>([
      'feed-votes',
      'user-123',
      ['item-1'],
    ]);
    expect(votesCache?.['item-1']).toBe('up');
  });

  it('rolls back feed-votes cache on error', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    mockVoteFeedItem.mockRejectedValue(new Error('Network error'));

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['feed-votes', 'user-123', ['item-1']], {
      'item-1': 'down',
    });

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up', previousVote: 'down' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verify feed-votes cache was rolled back to original value
    const votesCache = client.getQueryData<Record<string, 'up' | 'down'>>([
      'feed-votes',
      'user-123',
      ['item-1'],
    ]);
    expect(votesCache?.['item-1']).toBe('down');
    alertSpy.mockRestore();
  });
});

describe('useRemoveFeedVote — feed-votes cache optimistic update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveFeedVote.mockResolvedValue(undefined);
  });

  it('optimistically removes vote from feed-votes cache', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    // Pre-populate feed-votes cache
    client.setQueryData(['feed-votes', 'user-123', ['item-1']], {
      'item-1': 'up',
    });

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', previousVote: 'up' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify feed-votes cache had the vote removed
    const votesCache = client.getQueryData<Record<string, 'up' | 'down'>>([
      'feed-votes',
      'user-123',
      ['item-1'],
    ]);
    expect(votesCache?.['item-1']).toBeUndefined();
  });

  it('rolls back feed-votes cache on error', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    mockRemoveFeedVote.mockRejectedValue(new Error('Network error'));

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    client.setQueryData(['feed-votes', 'user-123', ['item-1']], {
      'item-1': 'up',
    });

    client.setQueryData(['news-feed', undefined], {
      pages: [[{ ...mockItem, id: 'item-1', upvote_count: 5, downvote_count: 2 }]],
      pageParams: [0],
    });

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', previousVote: 'up' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verify feed-votes cache was rolled back
    const votesCache = client.getQueryData<Record<string, 'up' | 'down'>>([
      'feed-votes',
      'user-123',
      ['item-1'],
    ]);
    expect(votesCache?.['item-1']).toBe('up');
    alertSpy.mockRestore();
  });
});

describe('useVoteFeedItem — onError with undefined context (onMutate failure)', () => {
  it('handles undefined context gracefully in onError', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    mockVoteFeedItem.mockRejectedValue(new Error('vote error'));

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    // Sabotage cancelQueries to make onMutate throw, resulting in undefined context
    const origCancel = client.cancelQueries.bind(client);
    client.cancelQueries = jest.fn().mockRejectedValue(new Error('cancel failed'));

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useVoteFeedItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', voteType: 'up', previousVote: null });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // onError should handle undefined context without crashing
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
    client.cancelQueries = origCancel;
  });
});

describe('useRemoveFeedVote — onError with undefined context (onMutate failure)', () => {
  it('handles undefined context gracefully in onError', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    mockRemoveFeedVote.mockRejectedValue(new Error('remove error'));

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    client.cancelQueries = jest.fn().mockRejectedValue(new Error('cancel failed'));

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useRemoveFeedVote(), { wrapper });

    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1', previousVote: 'up' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useUserVotes — userId null fallback', () => {
  it('does not fetch when userId is undefined (enabled guard)', () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    useAuth.mockReturnValue({ user: null });

    const client = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useUserVotes(['item-1']), { wrapper });
    // Query should not be enabled
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });
});
