jest.mock('../api');

import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNewsFeed, useFeaturedFeed } from '../hooks';
import { fetchNewsFeed, fetchFeaturedFeedItems } from '../api';

const mockFetchNewsFeed = fetchNewsFeed as jest.MockedFunction<typeof fetchNewsFeed>;
const mockFetchFeatured = fetchFeaturedFeedItems as jest.MockedFunction<
  typeof fetchFeaturedFeedItems
>;

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
  duration: null,
  is_pinned: false,
  is_featured: false,
  display_order: 0,
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
