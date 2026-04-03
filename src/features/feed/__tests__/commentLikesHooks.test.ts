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
const mockFetchUserCommentLikes = fetchUserCommentLikes as jest.MockedFunction<typeof fetchUserCommentLikes>;

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

  it('shows alert on error and rolls back like_count', async () => {
    mockLikeComment.mockRejectedValue(new Error('like failed'));
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

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

  it('throws when user is not logged in', async () => {
    mockUseAuth.mockReturnValueOnce({ user: null, session: null, isLoading: false, isGuest: false, setIsGuest: jest.fn() });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

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

  it('rolls back on error', async () => {
    mockUnlikeComment.mockRejectedValue(new Error('unlike failed'));
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

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
    mockUseAuth.mockReturnValueOnce({ user: null, session: null, isLoading: false, isGuest: false, setIsGuest: jest.fn() });
    renderHook(() => useUserCommentLikes(['c1']), { wrapper: createWrapper() });
    expect(mockFetchUserCommentLikes).not.toHaveBeenCalled();
  });
});
