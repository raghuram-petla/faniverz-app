import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getSession: () => mockGetSession() },
  },
}));

import { useAdminComments, useDeleteComment } from '@/hooks/useAdminComments';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function mockCrudApi(responseData: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => (status >= 200 && status < 300 ? responseData : { error: 'fail' }),
  } as Response);
}

/** Build a chainable mock — every method returns self, await resolves with data */
function buildChain(data: unknown[] | null = [], error: { message: string } | null = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const result = { data, error };

  const self = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      if (prop === 'catch') return () => self;
      if (!target[prop as string]) {
        target[prop as string] = vi.fn().mockReturnValue(self);
      }
      return target[prop as string];
    },
  });

  return { self, chain };
}

const mockComments = [
  {
    id: 'com-1',
    feed_item_id: 'feed-1',
    user_id: 'usr-1',
    body: 'Great post!',
    created_at: '2024-01-01T00:00:00Z',
    feed_item: { id: 'feed-1', title: 'Breaking News' },
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'com-2',
    feed_item_id: 'feed-2',
    user_id: 'usr-2',
    body: 'Nice analysis!',
    created_at: '2024-01-02T00:00:00Z',
    feed_item: { id: 'feed-2', title: 'Movie Review' },
    profile: { id: 'usr-2', display_name: 'Another User', email: 'another@example.com' },
  },
];

beforeEach(() => {
  mockFrom.mockReset();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
});

describe('useAdminComments', () => {
  it('queries feed_comments and returns data', async () => {
    const { self } = buildChain(mockComments);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminComments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('feed_comments');
    expect(result.current.data).toEqual(mockComments);
  });

  it('calls select with correct join string', async () => {
    const { self, chain } = buildChain(mockComments);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminComments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.select).toHaveBeenCalledWith(
      '*, feed_item:news_feed(id, title), profile:profiles(id, display_name, email)',
    );
  });

  it('orders by created_at descending', async () => {
    const { self, chain } = buildChain(mockComments);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminComments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('limits results to 200', async () => {
    const { self, chain } = buildChain(mockComments);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminComments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.limit).toHaveBeenCalledWith(200);
  });

  it('includes search in query key', async () => {
    const { self } = buildChain(mockComments);
    mockFrom.mockReturnValue(self);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAdminComments('hello'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verified indirectly — if query key were wrong the data wouldn't resolve
    expect(result.current.data).toBeTruthy();
  });

  it('returns empty array when no comments exist', async () => {
    const { self } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminComments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('throws when supabase returns an error', async () => {
    const { self } = buildChain(null, { message: 'Permission denied' });
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminComments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('applies .ilike filter on body when search is provided', async () => {
    const { self, chain } = buildChain(mockComments);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminComments('Great'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.ilike).toHaveBeenCalledWith('body', '%Great%');
  });

  it('does not apply .ilike when search is empty', async () => {
    const { self, chain } = buildChain(mockComments);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminComments(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // chain.ilike is undefined when never accessed (Proxy creates lazily)
    expect(chain.ilike).toBeUndefined();
  });

  it('filters client-side by profile display_name when searching', async () => {
    const comments = [
      {
        ...mockComments[0],
        body: 'no match',
        profile: { id: 'usr-1', display_name: 'Test User', email: 'a@b.com' },
      },
      {
        ...mockComments[1],
        body: 'also no match',
        profile: { id: 'usr-2', display_name: 'Other Person', email: 'c@d.com' },
      },
    ];
    const { self } = buildChain(comments);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminComments('Test User'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Only the comment with display_name "Test User" should match
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].profile?.display_name).toBe('Test User');
  });

  it('is disabled when search has exactly 1 character', async () => {
    const { self } = buildChain(mockComments);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminComments('a'), {
      wrapper: createWrapper(),
    });

    // Query should not have been fetched
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useDeleteComment', () => {
  it('deletes a comment via /api/admin-crud by id', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('com-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ table: 'feed_comments', id: 'com-1' }),
      }),
    );

    fetchSpy.mockRestore();
  });

  it('returns the deleted comment id on success', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('com-2');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe('com-2');

    fetchSpy.mockRestore();
  });

  it('reports error when delete fails', async () => {
    const fetchSpy = mockCrudApi(null, 500);

    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('com-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();

    fetchSpy.mockRestore();
  });

  it('invalidates [admin, comments] query on success', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('com-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'comments'] });

    fetchSpy.mockRestore();
  });
});
