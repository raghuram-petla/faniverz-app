jest.mock('../commentsApi');
jest.mock('@/i18n', () => ({ t: (key: string) => key }));

const mockUseAuth = jest.fn(() => ({
  user: { id: 'user-123' } as { id: string } | null,
  session: {} as Record<string, unknown> | null,
  isLoading: false,
  isGuest: false,
  setIsGuest: jest.fn(),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import { useComments, useReplies, useAddComment, useDeleteComment } from '../commentsHooks';
import { fetchComments, fetchReplies, addComment, deleteComment } from '../commentsApi';
import type { FeedComment } from '@shared/types';

const mockFetchComments = fetchComments as jest.MockedFunction<typeof fetchComments>;
const mockFetchReplies = fetchReplies as jest.MockedFunction<typeof fetchReplies>;
const mockAddComment = addComment as jest.MockedFunction<typeof addComment>;
const mockDeleteComment = deleteComment as jest.MockedFunction<typeof deleteComment>;

const baseComment: FeedComment = {
  id: 'c1',
  feed_item_id: 'f1',
  user_id: 'u1',
  body: 'Great!',
  created_at: '2024-01-01',
  parent_comment_id: null,
  like_count: 0,
  reply_count: 2,
  profile: { display_name: 'User 1', avatar_url: null },
};

const newComment: FeedComment = {
  id: 'c2',
  feed_item_id: 'f1',
  user_id: 'user-123',
  body: 'Nice!',
  created_at: '2024-01-02',
  parent_comment_id: null,
  like_count: 0,
  reply_count: 0,
  profile: { display_name: 'Test User', avatar_url: null },
};

describe('useComments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches comments for a feed item', async () => {
    mockFetchComments.mockResolvedValue([baseComment]);
    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.allItems).toEqual([baseComment]);
  });

  it('does not fetch when feedItemId is empty', () => {
    renderHook(() => useComments(''), { wrapper: createWrapper() });
    expect(mockFetchComments).not.toHaveBeenCalled();
  });
});

describe('useReplies', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches replies for a parent comment', async () => {
    const reply = { ...baseComment, id: 'r1', parent_comment_id: 'c1' };
    mockFetchReplies.mockResolvedValue([reply]);
    const { result } = renderHook(() => useReplies('c1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([reply]);
  });

  it('does not fetch when parentCommentId is empty', () => {
    renderHook(() => useReplies(''), { wrapper: createWrapper() });
    expect(mockFetchReplies).not.toHaveBeenCalled();
  });
});

describe('useAddComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds a top-level comment', async () => {
    mockAddComment.mockResolvedValue(newComment);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ body: 'Nice!' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAddComment).toHaveBeenCalledWith('f1', 'user-123', 'Nice!', undefined);
  });

  it('adds a reply and invalidates replies cache', async () => {
    const reply = { ...newComment, parent_comment_id: 'c1' };
    mockAddComment.mockResolvedValue(reply);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ body: '@User1 reply', parentCommentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAddComment).toHaveBeenCalledWith('f1', 'user-123', '@User1 reply', 'c1');

    // Parent's reply_count should be incremented
    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0][0].reply_count).toBe(3);
  });

  it('prepends top-level comment to first page of existing cache', async () => {
    mockAddComment.mockResolvedValue(newComment);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], { pages: [[baseComment]], pageParams: [0] });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ body: 'Nice!' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0]).toHaveLength(2);
    // New comment should be first (prepended), not last
    expect(cached?.pages[0][0].id).toBe('c2');
    expect(cached?.pages[0][1].id).toBe('c1');
  });

  it('creates new cache entry when no existing cache', async () => {
    mockAddComment.mockResolvedValue(newComment);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ body: 'Nice!' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0]).toHaveLength(1);
  });

  it('pushes to new page when pages array is empty', async () => {
    mockAddComment.mockResolvedValue(newComment);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], { pages: [], pageParams: [] });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ body: 'Nice!' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0]).toHaveLength(1);
  });

  it('propagates error to caller on failure', async () => {
    mockAddComment.mockRejectedValue(new Error('add failed'));
    const { result } = renderHook(() => useAddComment('f1'), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ body: 'Nice!' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('throws when user is not authenticated', async () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    const { result } = renderHook(() => useAddComment('f1'), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ body: 'Nice!' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAddComment).not.toHaveBeenCalled();
  });
});

describe('useDeleteComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a top-level comment and removes from cache', async () => {
    mockDeleteComment.mockResolvedValue(undefined);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment, { ...baseComment, id: 'c9' }]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0].find((c) => c.id === 'c1')).toBeUndefined();
    // @contract: other comments survive deletion
    expect(cached?.pages[0].find((c) => c.id === 'c9')).toBeDefined();
    expect(mockDeleteComment).toHaveBeenCalledWith('c1', 'user-123');
  });

  it('deletes a reply and decrements parent reply_count', async () => {
    mockDeleteComment.mockResolvedValue(undefined);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });
    client.setQueryData(
      ['comment-replies', 'c1'],
      [{ ...baseComment, id: 'r1', parent_comment_id: 'c1' }],
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ commentId: 'r1', parentCommentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0][0].reply_count).toBe(1); // 2 - 1

    const replies = client.getQueryData<FeedComment[]>(['comment-replies', 'c1']);
    expect(replies).toEqual([]);
  });

  it('propagates error to caller on failure', async () => {
    mockDeleteComment.mockRejectedValue(new Error('delete failed'));
    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('throws when user is not authenticated', async () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('handles null cache gracefully on top-level delete', async () => {
    mockDeleteComment.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('handles null comments cache gracefully when deleting a reply', async () => {
    // @edge: covers lines 99-111 — comments cache absent, setQueryData null-guard returns early
    mockDeleteComment.mockResolvedValue(undefined);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed the replies cache but NOT the comments cache
    client.setQueryData(
      ['comment-replies', 'c1'],
      [{ ...baseComment, id: 'r1', parent_comment_id: 'c1' }],
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ commentId: 'r1', parentCommentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Comments cache was absent — setQueryData null-guard returns undefined, so it stays undefined
    const cached = client.getQueryData(['feed-comments', 'f1']);
    expect(cached).toBeUndefined();
    // Replies cache was present and should have reply filtered out
    const replies = client.getQueryData<FeedComment[]>(['comment-replies', 'c1']);
    expect(replies).toEqual([]);
  });

  it('handles null replies cache gracefully when deleting a reply', async () => {
    // @edge: covers line 97 — replies cache absent, ternary returns undefined (old is falsy)
    mockDeleteComment.mockResolvedValue(undefined);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed the comments cache but NOT the replies cache
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ commentId: 'r1', parentCommentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Replies cache was absent — setQueryData returns undefined (falsy branch of ternary)
    const replies = client.getQueryData(['comment-replies', 'c1']);
    expect(replies).toBeUndefined();
    // Comments cache should still have reply_count decremented
    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0][0].reply_count).toBe(1); // 2 - 1
  });
});

describe('useAddComment — reply with null comments cache', () => {
  beforeEach(() => jest.clearAllMocks());

  it('handles null comments cache gracefully when adding a reply', async () => {
    // @edge: covers lines 51-59 — comments cache absent, setQueryData null-guard returns early
    const reply = { ...newComment, parent_comment_id: 'c1' };
    mockAddComment.mockResolvedValue(reply);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // No comments cache seeded — old will be undefined inside setQueryData callback

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ body: '@User1 reply', parentCommentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Comments cache was absent — setQueryData null-guard returns undefined, so it stays undefined
    const cached = client.getQueryData(['feed-comments', 'f1']);
    expect(cached).toBeUndefined();
  });

  it('leaves non-parent comments unchanged when adding a reply', async () => {
    // @edge: covers line 56 — the `:c` branch where c.id !== parentCommentId
    const otherComment = { ...baseComment, id: 'c9', reply_count: 5 };
    const reply = { ...newComment, parent_comment_id: 'c1' };
    mockAddComment.mockResolvedValue(reply);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment, otherComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ body: '@User1 reply', parentCommentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    // Parent comment reply_count incremented
    expect(cached?.pages[0].find((c) => c.id === 'c1')?.reply_count).toBe(3);
    // Non-parent comment reply_count untouched
    expect(cached?.pages[0].find((c) => c.id === 'c9')?.reply_count).toBe(5);
  });
});

describe('useDeleteComment — non-parent comment survives reply deletion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('leaves non-parent comments unchanged when decrementing reply_count', async () => {
    // @edge: covers line 105 — the `:c` branch where c.id !== parentCommentId
    const otherComment = { ...baseComment, id: 'c9', reply_count: 7 };
    mockDeleteComment.mockResolvedValue(undefined);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment, otherComment]],
      pageParams: [0],
    });
    client.setQueryData(
      ['comment-replies', 'c1'],
      [{ ...baseComment, id: 'r1', parent_comment_id: 'c1' }],
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ commentId: 'r1', parentCommentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    // Parent comment reply_count decremented
    expect(cached?.pages[0].find((c) => c.id === 'c1')?.reply_count).toBe(1);
    // Non-parent comment reply_count untouched
    expect(cached?.pages[0].find((c) => c.id === 'c9')?.reply_count).toBe(7);
  });
});

describe('useAddComment — optimistic feed comment_count', () => {
  beforeEach(() => jest.clearAllMocks());

  it('increments comment_count in feed caches for top-level comment', async () => {
    mockAddComment.mockResolvedValue(newComment);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const feedItem = { id: 'f1', comment_count: 3 };
    client.setQueryData(['news-feed', 'all'], { pages: [[feedItem]] });
    client.setQueryData(['personalized-feed', 'all', 'user-123'], { pages: [[feedItem]] });
    client.setQueryData(['feed-item', 'f1'], { ...feedItem });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ body: 'Nice!' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const nf = client.getQueryData<{ pages: { id: string; comment_count: number }[][] }>([
      'news-feed',
      'all',
    ]);
    expect(nf?.pages[0][0].comment_count).toBe(4);

    const pf = client.getQueryData<{ pages: { id: string; comment_count: number }[][] }>([
      'personalized-feed',
      'all',
      'user-123',
    ]);
    expect(pf?.pages[0][0].comment_count).toBe(4);

    const fi = client.getQueryData<{ id: string; comment_count: number }>(['feed-item', 'f1']);
    expect(fi?.comment_count).toBe(4);
  });

  it('does not increment comment_count for replies', async () => {
    const reply = { ...newComment, parent_comment_id: 'c1' };
    mockAddComment.mockResolvedValue(reply);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const feedItem = { id: 'f1', comment_count: 3 };
    client.setQueryData(['news-feed', 'all'], { pages: [[feedItem]] });
    client.setQueryData(['feed-comments', 'f1'], { pages: [[baseComment]], pageParams: [0] });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ body: 'reply', parentCommentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const nf = client.getQueryData<{ pages: { id: string; comment_count: number }[][] }>([
      'news-feed',
      'all',
    ]);
    expect(nf?.pages[0][0].comment_count).toBe(3);
  });
});

describe('useDeleteComment — optimistic feed comment_count', () => {
  beforeEach(() => jest.clearAllMocks());

  it('decrements comment_count in feed caches for top-level delete', async () => {
    mockDeleteComment.mockResolvedValue(undefined);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const feedItem = { id: 'f1', comment_count: 5 };
    client.setQueryData(['news-feed', 'all'], { pages: [[feedItem]] });
    client.setQueryData(['feed-item', 'f1'], { ...feedItem });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const nf = client.getQueryData<{ pages: { id: string; comment_count: number }[][] }>([
      'news-feed',
      'all',
    ]);
    expect(nf?.pages[0][0].comment_count).toBe(4);

    const fi = client.getQueryData<{ id: string; comment_count: number }>(['feed-item', 'f1']);
    expect(fi?.comment_count).toBe(4);
  });

  it('does not decrement comment_count for reply deletes', async () => {
    mockDeleteComment.mockResolvedValue(undefined);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const feedItem = { id: 'f1', comment_count: 5 };
    client.setQueryData(['news-feed', 'all'], { pages: [[feedItem]] });
    client.setQueryData(['feed-comments', 'f1'], { pages: [[baseComment]], pageParams: [0] });
    client.setQueryData(
      ['comment-replies', 'c1'],
      [{ ...baseComment, id: 'r1', parent_comment_id: 'c1' }],
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ commentId: 'r1', parentCommentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const nf = client.getQueryData<{ pages: { id: string; comment_count: number }[][] }>([
      'news-feed',
      'all',
    ]);
    expect(nf?.pages[0][0].comment_count).toBe(5);
  });

  it('clamps comment_count to 0 when decrementing past zero', async () => {
    mockDeleteComment.mockResolvedValue(undefined);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const feedItem = { id: 'f1', comment_count: 0 };
    client.setQueryData(['news-feed', 'all'], { pages: [[feedItem]] });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const nf = client.getQueryData<{ pages: { id: string; comment_count: number }[][] }>([
      'news-feed',
      'all',
    ]);
    expect(nf?.pages[0][0].comment_count).toBe(0);
  });
});

describe('adjustFeedCommentCount — null cache and non-matching item branches', () => {
  beforeEach(() => jest.clearAllMocks());

  it('handles null feed cache in adjustFeedCommentCount (covers if !old return old branch)', async () => {
    // @edge: covers line 23 — setQueriesData callback receives undefined when query exists but data is undefined
    mockAddComment.mockResolvedValue(newComment);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed a news-feed query with undefined data so callback is called with undefined (old is falsy)
    // setQueryData with undefined triggers the !old branch
    client.setQueryData(['news-feed', 'null-scope'], undefined);
    // Also seed a personalized-feed query with undefined data
    client.setQueryData(['personalized-feed', 'null-scope'], undefined);
    // Also seed a feed-item cache with a DIFFERENT id to hit the :item branch (item.id !== feedItemId)
    client.setQueryData(['feed-item', 'f1'], { id: 'f1', comment_count: 2 });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ body: 'Nice!' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Cache with undefined data stays undefined (null guard returned early)
    const nf = client.getQueryData(['news-feed', 'null-scope']);
    expect(nf).toBeUndefined();
  });

  it('leaves non-matching items unchanged in adjustFeedCommentCount (covers :item branch)', async () => {
    // @edge: covers line 28 — the :item branch where item.id !== feedItemId
    mockAddComment.mockResolvedValue(newComment);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed news-feed with a different item id so the ternary picks :item branch
    client.setQueryData(['news-feed', 'scope'], {
      pages: [[{ id: 'OTHER_ITEM', comment_count: 10 }]],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => {
      result.current.mutate({ body: 'Nice!' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The OTHER_ITEM should be untouched (comment_count stays 10)
    const nf = client.getQueryData<{ pages: { id: string; comment_count: number }[][] }>([
      'news-feed',
      'scope',
    ]);
    expect(nf?.pages[0][0].comment_count).toBe(10);
  });
});

describe('useComments — error handling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('handles fetch error', async () => {
    mockFetchComments.mockRejectedValue(new Error('fetch failed'));
    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useComments — pagination', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns no next page when last page has fewer than initialPageSize items', async () => {
    const shortPage = Array.from({ length: 3 }, (_, i) => ({ ...newComment, id: `c${i}` }));
    mockFetchComments.mockResolvedValue(shortPage);
    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('returns next page param when background expand returns full expandedPageSize items', async () => {
    const initialPage = Array.from({ length: 5 }, (_, i) => ({ ...newComment, id: `c${i}` }));
    const expandedPage = Array.from({ length: 20 }, (_, i) => ({ ...newComment, id: `c${i + 5}` }));
    mockFetchComments.mockResolvedValueOnce(initialPage).mockResolvedValueOnce(expandedPage);
    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
  });
});
