jest.mock('../commentLikesApi');
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
import { useLikeComment, useUnlikeComment, useUserCommentLikes } from '../commentLikesHooks';
import { likeComment, unlikeComment, fetchUserCommentLikes } from '../commentLikesApi';
import type { FeedComment } from '@shared/types';

const mockLikeComment = likeComment as jest.MockedFunction<typeof likeComment>;
const mockUnlikeComment = unlikeComment as jest.MockedFunction<typeof unlikeComment>;
const mockFetchUserCommentLikes = fetchUserCommentLikes as jest.MockedFunction<
  typeof fetchUserCommentLikes
>;

const baseComment: FeedComment = {
  id: 'c1',
  feed_item_id: 'f1',
  user_id: 'u1',
  body: 'Great!',
  created_at: '2024-01-01',
  parent_comment_id: null,
  like_count: 3,
  reply_count: 0,
  profile: { display_name: 'User 1', avatar_url: null },
};

describe('useLikeComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('likes a comment and optimistically increments like_count', async () => {
    mockLikeComment.mockResolvedValue(undefined);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useLikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    // Optimistic: like_count should be 4
    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0][0].like_count).toBe(4);
  });

  it('snapshots existing comment-likes cache in onMutate forEach (line 34)', async () => {
    mockLikeComment.mockResolvedValue(undefined);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed a comment-likes cache entry so getQueriesData finds data and the forEach pushes it
    client.setQueryData(['comment-likes-set', 'user-123', ['c1']], { c1: true } as Record<
      string,
      true
    >);
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useLikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    // Optimistic update applied on top of the seeded likes cache
    const likesCache = client.getQueryData<Record<string, true>>([
      'comment-likes-set',
      'user-123',
      ['c1'],
    ]);
    expect(likesCache).toMatchObject({ c1: true });
  });

  it('increments like_count in replies cache (line 138-140)', async () => {
    mockLikeComment.mockResolvedValue(undefined);

    const replyComment: FeedComment = { ...baseComment, id: 'c1', like_count: 2 };

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });
    // Seed replies cache so the setQueriesData for REPLIES_KEY covers the old.map() path
    client.setQueryData(['comment-replies', 'parent-1'], [replyComment]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useLikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    // Replies cache should have incremented like_count
    const repliesCache = client.getQueryData<FeedComment[]>(['comment-replies', 'parent-1']);
    expect(repliesCache?.[0].like_count).toBe(3);
  });

  it('shows alert on error and rolls back like_count', async () => {
    mockLikeComment.mockRejectedValue(new Error('like failed'));
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useLikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();

    // Rolled back: like_count should be back to 3
    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0][0].like_count).toBe(3);
    alertSpy.mockRestore();
  });

  it('rolls back comment-likes cache via prevLikes on error (line 47)', async () => {
    mockLikeComment.mockRejectedValue(new Error('like failed'));
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed a comment-likes cache so onMutate snapshots it into prevLikes
    const initialLikes: Record<string, true> = { c2: true };
    client.setQueryData(['comment-likes-set', 'user-123', ['c1', 'c2']], initialLikes);
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useLikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // onError should have restored the snapshot — c1 must NOT be in the likes set
    const restoredLikes = client.getQueryData<Record<string, true>>([
      'comment-likes-set',
      'user-123',
      ['c1', 'c2'],
    ]);
    expect(restoredLikes).toEqual(initialLikes);
    alertSpy.mockRestore();
  });

  it('throws when user is not logged in', async () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useLikeComment('f1'), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockLikeComment).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useUnlikeComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('unlikes a comment and optimistically decrements like_count', async () => {
    mockUnlikeComment.mockResolvedValue(undefined);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useUnlikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0][0].like_count).toBe(2);
  });

  it('snapshots existing comment-likes cache and removes commentId via destructure (lines 76, 78-80)', async () => {
    mockUnlikeComment.mockResolvedValue(undefined);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed a comment-likes cache with c1 already liked so forEach captures it and the
    // setQueriesData destructure removes c1 from the map
    const initialLikes: Record<string, true> = { c1: true, c2: true };
    client.setQueryData(['comment-likes-set', 'user-123', ['c1', 'c2']], initialLikes);
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useUnlikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    // After optimistic update c1 must be removed from the likes set, c2 must remain
    const likesCache = client.getQueryData<Record<string, true>>([
      'comment-likes-set',
      'user-123',
      ['c1', 'c2'],
    ]);
    expect(likesCache).not.toHaveProperty('c1');
    expect(likesCache).toHaveProperty('c2', true);
  });

  it('rolls back on error', async () => {
    mockUnlikeComment.mockRejectedValue(new Error('unlike failed'));
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useUnlikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = client.getQueryData<{ pages: FeedComment[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0][0].like_count).toBe(3);
    alertSpy.mockRestore();
  });

  it('throws when user is not logged in', async () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useUnlikeComment('f1'), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockUnlikeComment).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('rolls back comment-likes cache via prevLikes on error (line 89)', async () => {
    mockUnlikeComment.mockRejectedValue(new Error('unlike failed'));
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed a comment-likes cache with c1 liked so the snapshot captures it
    const initialLikes: Record<string, true> = { c1: true };
    client.setQueryData(['comment-likes-set', 'user-123', ['c1']], initialLikes);
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useUnlikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // onError for-loop should restore the snapshot — c1 must be back in the likes set
    const restoredLikes = client.getQueryData<Record<string, true>>([
      'comment-likes-set',
      'user-123',
      ['c1'],
    ]);
    expect(restoredLikes).toEqual(initialLikes);
    alertSpy.mockRestore();
  });

  it('decrements like_count in replies cache on unlike (line 138-140 via decrement)', async () => {
    mockUnlikeComment.mockResolvedValue(undefined);

    const replyComment: FeedComment = { ...baseComment, id: 'c1', like_count: 5 };

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });
    // Seed replies cache so incrementLikeCount(-1) hits the old.map() path
    client.setQueryData(['comment-replies', 'parent-x'], [replyComment]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useUnlikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    const repliesCache = client.getQueryData<FeedComment[]>(['comment-replies', 'parent-x']);
    expect(repliesCache?.[0].like_count).toBe(4);
  });
});

describe('useUserCommentLikes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches liked comment IDs', async () => {
    mockFetchUserCommentLikes.mockResolvedValue({ c1: true, c3: true });

    const { result } = renderHook(() => useUserCommentLikes(['c1', 'c2', 'c3']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ c1: true, c3: true });
  });

  it('does not fetch when commentIds is empty', () => {
    renderHook(() => useUserCommentLikes([]), { wrapper: createWrapper() });
    expect(mockFetchUserCommentLikes).not.toHaveBeenCalled();
  });

  it('does not fetch when user is not authenticated', () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    renderHook(() => useUserCommentLikes(['c1']), { wrapper: createWrapper() });
    expect(mockFetchUserCommentLikes).not.toHaveBeenCalled();
  });

  it('sortedIds useMemo returns non-empty when idsKey is truthy (covers idsKey split branch)', async () => {
    mockFetchUserCommentLikes.mockResolvedValue({ c1: true });
    const { result } = renderHook(() => useUserCommentLikes(['c1']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // idsKey = 'c1' (truthy) so idsKey.split(',') path taken
    expect(result.current.data).toEqual({ c1: true });
  });
});

describe('useLikeComment — null old branch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('primaryUpdater spreads old ?? {} when old is null (covers ...(old ?? {}) branch)', async () => {
    mockLikeComment.mockResolvedValue(undefined);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Set null data for comment-likes cache so primaryUpdater is called with null
    client.setQueryData(['comment-likes-set', 'user-123', ['c1']], null);
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useLikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // After optimistic update with null old, cache has { c1: true }
    const likesCache = client.getQueryData<Record<string, true>>([
      'comment-likes-set',
      'user-123',
      ['c1'],
    ]);
    expect(likesCache).toMatchObject({ c1: true });
  });
});

describe('useUnlikeComment — null old branch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('primaryUpdater returns {} when old is null (covers if (!old) return {} branch)', async () => {
    mockUnlikeComment.mockResolvedValue(undefined);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Set null data for comment-likes cache so primaryUpdater is called with null
    client.setQueryData(['comment-likes-set', 'user-123', ['c1']], null);
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useUnlikeComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate({ commentId: 'c1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // After optimistic update with null old, primaryUpdater returned {}
    const likesCache = client.getQueryData<Record<string, true>>([
      'comment-likes-set',
      'user-123',
      ['c1'],
    ]);
    expect(likesCache).toEqual({});
  });
});
