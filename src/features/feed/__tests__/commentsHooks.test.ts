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

  it('appends top-level comment to existing cache', async () => {
    mockAddComment.mockResolvedValue(newComment);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], { pages: [[baseComment]], pageParams: [0] });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => { result.current.mutate({ body: 'Nice!' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0]).toHaveLength(2);
  });

  it('creates new cache entry when no existing cache', async () => {
    mockAddComment.mockResolvedValue(newComment);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });
    await act(async () => { result.current.mutate({ body: 'Nice!' }); });
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
    await act(async () => { result.current.mutate({ body: 'Nice!' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0]).toHaveLength(1);
  });

  it('propagates error to caller on failure', async () => {
    mockAddComment.mockRejectedValue(new Error('add failed'));
    const { result } = renderHook(() => useAddComment('f1'), { wrapper: createWrapper() });

    await act(async () => { result.current.mutate({ body: 'Nice!' }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('throws when user is not authenticated', async () => {
    mockUseAuth.mockReturnValueOnce({ user: null, session: null, isLoading: false, isGuest: false, setIsGuest: jest.fn() });
    const { result } = renderHook(() => useAddComment('f1'), { wrapper: createWrapper() });

    await act(async () => { result.current.mutate({ body: 'Nice!' }); });
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
    client.setQueryData(['comment-replies', 'c1'], [
      { ...baseComment, id: 'r1', parent_comment_id: 'c1' },
    ]);

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

    await act(async () => { result.current.mutate({ commentId: 'c1' }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('throws when user is not authenticated', async () => {
    mockUseAuth.mockReturnValueOnce({ user: null, session: null, isLoading: false, isGuest: false, setIsGuest: jest.fn() });
    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper: createWrapper() });

    await act(async () => { result.current.mutate({ commentId: 'c1' }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('handles null cache gracefully on top-level delete', async () => {
    mockDeleteComment.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper: createWrapper() });

    await act(async () => { result.current.mutate({ commentId: 'c1' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
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
