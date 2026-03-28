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
    expect(result.current.allItems).toEqual([baseComment]);
    expect(mockFetchComments).toHaveBeenCalledWith('f1', 0, 5);
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

describe('useDeleteComment — mutationFn throws for unauthenticated user', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws directly from mutationFn when user is null', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });

    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('c1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    alertSpy.mockRestore();
  });
});

describe('useAddComment — mutationFn throws for unauthenticated user directly', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mutationFn throws directly when user is null (not authenticated check)', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });

    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddComment('f1'), { wrapper });

    await act(async () => {
      result.current.mutate('Nice!');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // addComment API should NOT be called since mutationFn throws before it
    expect(mockAddComment).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useComments — getNextPageParam', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns undefined for next page when last page has fewer than initialPageSize items', async () => {
    // Return 3 items — less than initialPageSize (5), so no next page
    const shortPage = Array.from({ length: 3 }, (_, i) => ({ ...newComment, id: `c${i}` }));
    mockFetchComments.mockResolvedValue(shortPage);

    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('returns next page param when background expand returns full expandedPageSize items', async () => {
    // First call (initialPageSize=5): return 5 items → triggers background expand
    const initialPage = Array.from({ length: 5 }, (_, i) => ({ ...newComment, id: `c${i}` }));
    // Second call (expandedPageSize=20): return 20 items → hasNextPage = true
    const expandedPage = Array.from({ length: 20 }, (_, i) => ({ ...newComment, id: `c${i + 5}` }));
    mockFetchComments.mockResolvedValueOnce(initialPage).mockResolvedValueOnce(expandedPage);

    const { result } = renderHook(() => useComments('f1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
  });
});
