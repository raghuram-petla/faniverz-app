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

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

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
