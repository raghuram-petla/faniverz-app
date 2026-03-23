jest.mock('../commentsApi');

jest.mock('@/i18n', () => ({ t: (key: string) => key }));

const mockUseAuth = jest.fn(() => ({
  user: { id: 'user-123' },
  session: {},
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
import { useComments, useAddComment, useDeleteComment } from '../commentsHooks';
import { fetchComments, addComment, deleteComment } from '../commentsApi';

const mockFetchComments = fetchComments as jest.MockedFunction<typeof fetchComments>;
const mockAddComment = addComment as jest.MockedFunction<typeof addComment>;
const mockDeleteComment = deleteComment as jest.MockedFunction<typeof deleteComment>;

const baseComment = {
  id: 'c1',
  feed_item_id: 'f1',
  user_id: 'u1',
  body: 'Great!',
  created_at: '2024-01-01',
  profile: { display_name: 'User 1' },
};

describe('useComments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches comments for a feed item', async () => {
    mockFetchComments.mockResolvedValue([baseComment]);

    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual([baseComment]);
    expect(mockFetchComments).toHaveBeenCalledWith('f1', 0, 20);
  });

  it('does not fetch when feedItemId is empty', () => {
    renderHook(() => useComments(''), { wrapper: createWrapper() });
    expect(mockFetchComments).not.toHaveBeenCalled();
  });

  it('handles fetch error', async () => {
    mockFetchComments.mockRejectedValue(new Error('fetch failed'));
    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

const newComment = {
  id: 'c2',
  feed_item_id: 'f1',
  user_id: 'user-123',
  body: 'Nice!',
  created_at: '2024-01-02',
  profile: { display_name: 'Test User' },
};

describe('useAddComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds a comment and updates cache', async () => {
    mockAddComment.mockResolvedValue(newComment);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('Nice!');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAddComment).toHaveBeenCalledWith('f1', 'user-123', 'Nice!');
  });

  it('appends comment to existing cache pages', async () => {
    mockAddComment.mockResolvedValue(newComment);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Pre-populate the cache with one page of comments
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [[baseComment]],
      pageParams: [0],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('Nice!');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cached = client.getQueryData<{ pages: unknown[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0]).toHaveLength(2);
  });

  it('creates new cache entry when no existing cache', async () => {
    mockAddComment.mockResolvedValue(newComment);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // No pre-populated cache

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('Nice!');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cached = client.getQueryData<{ pages: unknown[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0]).toHaveLength(1);
  });

  it('shows alert on error', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});
    mockAddComment.mockRejectedValue(new Error('add failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('Nice!');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('throws when user is not authenticated', async () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    mockAddComment.mockRejectedValue(new Error('Not authenticated'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('Nice!');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
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

  it('removes deleted comment from cache', async () => {
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
      result.current.mutate('c1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cached = client.getQueryData<{ pages: { id: string }[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0].find((c) => c.id === 'c1')).toBeUndefined();
    expect(cached?.pages[0].find((c) => c.id === 'c9')).toBeDefined();
  });

  it('handles null cache gracefully', async () => {
    mockDeleteComment.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('c1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('shows alert on delete error', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});
    mockDeleteComment.mockRejectedValue(new Error('delete failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('c1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('throws when user is not authenticated', async () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    mockDeleteComment.mockRejectedValue(new Error('Not authenticated'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('c1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAddComment — empty pages branch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pushes to new page when pages array is empty in cache', async () => {
    mockAddComment.mockResolvedValue(newComment);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Pre-populate with empty pages array (edge case)
    client.setQueryData(['feed-comments', 'f1'], {
      pages: [],
      pageParams: [],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useAddComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('Nice!');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cached = client.getQueryData<{ pages: unknown[][] }>(['feed-comments', 'f1']);
    expect(cached?.pages[0]).toHaveLength(1);
  });
});

describe('useComments — getNextPageParam', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns undefined for next page when last page has fewer than PAGE_SIZE items', async () => {
    // Return 5 items — less than PAGE_SIZE (20), so no next page
    const shortPage = Array.from({ length: 5 }, (_, i) => ({ ...newComment, id: `c${i}` }));
    mockFetchComments.mockResolvedValue(shortPage);

    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('returns next page param when last page has exactly PAGE_SIZE items', async () => {
    // Return 20 items (PAGE_SIZE) — indicates there may be more
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ ...newComment, id: `c${i}` }));
    mockFetchComments.mockResolvedValue(fullPage);

    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });
});
