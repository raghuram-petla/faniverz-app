jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'user-1' } })),
}));

jest.mock('@/features/feed/viewTrackingApi', () => ({
  recordFeedViews: jest.fn(),
}));

import { renderHook } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecordPostView } from '../useRecordPostView';
import { recordFeedViews } from '@/features/feed/viewTrackingApi';
import type { NewsFeedItem } from '@shared/types';

const mockRecordFeedViews = recordFeedViews as jest.MockedFunction<typeof recordFeedViews>;

const makePost = (overrides: Partial<NewsFeedItem> = {}): NewsFeedItem => ({
  id: 'post-1',
  feed_type: 'video',
  content_type: 'trailer',
  title: 'Test',
  description: null,
  movie_id: null,
  source_table: null,
  source_id: null,
  thumbnail_url: null,
  youtube_id: null,
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 5,
  downvote_count: 1,
  view_count: 100,
  comment_count: 0,
  bookmark_count: 0,
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

function createWrapper(client?: QueryClient) {
  const qc = client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useRecordPostView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordFeedViews.mockResolvedValue(undefined);
  });

  it('records a view when post and user are present', () => {
    const post = makePost();
    renderHook(() => useRecordPostView(post), { wrapper: createWrapper() });
    expect(mockRecordFeedViews).toHaveBeenCalledWith(['post-1']);
  });

  it('does not record a view when post is null', () => {
    renderHook(() => useRecordPostView(null), { wrapper: createWrapper() });
    expect(mockRecordFeedViews).not.toHaveBeenCalled();
  });

  it('does not record a view when post is undefined', () => {
    renderHook(() => useRecordPostView(undefined), { wrapper: createWrapper() });
    expect(mockRecordFeedViews).not.toHaveBeenCalled();
  });

  it('does not record a view when user is null', () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    useAuth.mockReturnValue({ user: null });

    const post = makePost();
    renderHook(() => useRecordPostView(post), { wrapper: createWrapper() });
    expect(mockRecordFeedViews).not.toHaveBeenCalled();

    useAuth.mockReturnValue({ user: { id: 'user-1' } });
  });

  it('only records once per post ID (deduplicates)', () => {
    const post = makePost();
    const { rerender } = renderHook(() => useRecordPostView(post), {
      wrapper: createWrapper(),
    });
    rerender({});
    expect(mockRecordFeedViews).toHaveBeenCalledTimes(1);
  });

  it('optimistically increments view_count in feed-item cache', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const post = makePost({ view_count: 42 });
    client.setQueryData(['feed-item', 'post-1'], post);

    renderHook(() => useRecordPostView(post), { wrapper: createWrapper(client) });

    const cached = client.getQueryData<NewsFeedItem>(['feed-item', 'post-1']);
    expect(cached?.view_count).toBe(43);
  });

  it('optimistically increments view_count in news-feed cache', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const post = makePost({ view_count: 10 });
    client.setQueryData(['news-feed', undefined], {
      pages: [[post]],
      pageParams: [0],
    });

    renderHook(() => useRecordPostView(post), { wrapper: createWrapper(client) });

    const cached = client.getQueryData<{ pages: NewsFeedItem[][] }>(['news-feed', undefined]);
    expect(cached?.pages[0][0].view_count).toBe(11);
  });

  it('optimistically increments view_count in personalized-feed cache', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const post = makePost({ view_count: 20 });
    client.setQueryData(['personalized-feed', 'all', 'user-1'], {
      pages: [[post]],
      pageParams: [0],
    });

    renderHook(() => useRecordPostView(post), { wrapper: createWrapper(client) });

    const cached = client.getQueryData<{ pages: NewsFeedItem[][] }>([
      'personalized-feed',
      'all',
      'user-1',
    ]);
    expect(cached?.pages[0][0].view_count).toBe(21);
  });

  it('does not modify feed-item cache when old data is undefined', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const post = makePost();
    // No cache data set for feed-item

    renderHook(() => useRecordPostView(post), { wrapper: createWrapper(client) });

    const cached = client.getQueryData<NewsFeedItem>(['feed-item', 'post-1']);
    expect(cached).toBeUndefined();
  });

  it('does not modify feed list cache when old data is undefined', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const post = makePost();
    // No cache data set for news-feed

    renderHook(() => useRecordPostView(post), { wrapper: createWrapper(client) });

    const cached = client.getQueryData<{ pages: NewsFeedItem[][] }>(['news-feed', undefined]);
    expect(cached).toBeUndefined();
  });

  it('only increments matching item in feed list cache, leaves others unchanged', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const post = makePost({ id: 'post-1', view_count: 10 });
    const otherPost = makePost({ id: 'post-2', view_count: 50 });
    client.setQueryData(['news-feed', undefined], {
      pages: [[post, otherPost]],
      pageParams: [0],
    });

    renderHook(() => useRecordPostView(post), { wrapper: createWrapper(client) });

    const cached = client.getQueryData<{ pages: NewsFeedItem[][] }>(['news-feed', undefined]);
    expect(cached?.pages[0][0].view_count).toBe(11);
    expect(cached?.pages[0][1].view_count).toBe(50);
  });

  it('handles setQueriesData callback with undefined old value (covers !old branch)', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const post = makePost({ id: 'post-1', view_count: 5 });

    // Set a matching news-feed query entry with undefined data to trigger the !old branch
    client.setQueryData(['news-feed', 'all'], undefined);

    renderHook(() => useRecordPostView(post), { wrapper: createWrapper(client) });

    // The callback receives undefined, returns undefined — cache stays undefined
    const cached = client.getQueryData(['news-feed', 'all']);
    expect(cached).toBeUndefined();
  });
});
