jest.mock('../commentsApi');

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
import { useComments, useAddComment, useDeleteComment } from '../commentsHooks';
import { fetchComments, addComment, deleteComment } from '../commentsApi';

const mockFetchComments = fetchComments as jest.MockedFunction<typeof fetchComments>;
const mockAddComment = addComment as jest.MockedFunction<typeof addComment>;
const mockDeleteComment = deleteComment as jest.MockedFunction<typeof deleteComment>;

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useComments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches comments for a feed item', async () => {
    const comments = [
      {
        id: 'c1',
        feed_item_id: 'f1',
        user_id: 'u1',
        body: 'Great!',
        created_at: '2024-01-01',
        profile: { display_name: 'User 1' },
      },
    ];
    mockFetchComments.mockResolvedValue(comments);

    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual(comments);
    expect(mockFetchComments).toHaveBeenCalledWith('f1', 0, 20);
  });

  it('does not fetch when feedItemId is empty', () => {
    renderHook(() => useComments(''), { wrapper: createWrapper() });
    expect(mockFetchComments).not.toHaveBeenCalled();
  });
});

describe('useAddComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds a comment and updates cache', async () => {
    const newComment = {
      id: 'c2',
      feed_item_id: 'f1',
      user_id: 'user-123',
      body: 'Nice!',
      created_at: '2024-01-02',
      profile: { display_name: 'Test User' },
    };
    mockAddComment.mockResolvedValue(newComment);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('Nice!');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAddComment).toHaveBeenCalledWith('f1', 'user-123', 'Nice!');
  });
});

describe('useDeleteComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a comment', async () => {
    mockDeleteComment.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('c1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteComment).toHaveBeenCalledWith('c1', 'user-123');
  });
});
