import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useAdminWatchlist, useDeleteWatchlistEntry } from '@/hooks/useAdminWatchlist';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
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

const mockEntries = [
  {
    id: 'wl-1',
    user_id: 'usr-1',
    movie_id: 'mov-1',
    status: 'watchlist',
    added_at: '2024-01-01T00:00:00Z',
    watched_at: null,
    movie: { id: 'mov-1', title: 'Pushpa 2', poster_url: null },
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'wl-2',
    user_id: 'usr-2',
    movie_id: 'mov-2',
    status: 'watched',
    added_at: '2024-01-02T00:00:00Z',
    watched_at: '2024-01-05T00:00:00Z',
    movie: { id: 'mov-2', title: 'Salaar', poster_url: null },
    profile: { id: 'usr-2', display_name: 'Another User', email: 'another@example.com' },
  },
];

beforeEach(() => {
  mockFrom.mockReset();
});

describe('useAdminWatchlist', () => {
  it('queries watchlists and returns data', async () => {
    const { self } = buildChain(mockEntries);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('watchlists');
    expect(result.current.data).toEqual(mockEntries);
  });

  it('calls select with correct join string', async () => {
    const { self, chain } = buildChain(mockEntries);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.select).toHaveBeenCalledWith(
      '*, movie:movies(id, title, poster_url), profile:profiles(id, display_name, email)',
    );
  });

  it('orders by added_at descending', async () => {
    const { self, chain } = buildChain(mockEntries);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.order).toHaveBeenCalledWith('added_at', { ascending: false });
  });

  it('limits results to 200', async () => {
    const { self, chain } = buildChain(mockEntries);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.limit).toHaveBeenCalledWith(200);
  });

  it('includes search in query key', async () => {
    const { self } = buildChain(mockEntries);
    mockFrom.mockReturnValue(self);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAdminWatchlist('Pushpa'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeTruthy();
  });

  it('returns empty array when no entries exist', async () => {
    const { self } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('throws when supabase returns an error', async () => {
    const { self } = buildChain(null, { message: 'Permission denied' });
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('filters client-side by movie title when searching', async () => {
    const { self } = buildChain(mockEntries);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminWatchlist('Pushpa'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].movie?.title).toBe('Pushpa 2');
  });

  it('filters client-side by profile display_name when searching', async () => {
    const { self } = buildChain(mockEntries);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminWatchlist('Another'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].profile?.display_name).toBe('Another User');
  });

  it('is disabled when search has exactly 1 character', async () => {
    const { self } = buildChain(mockEntries);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminWatchlist('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useDeleteWatchlistEntry', () => {
  it('calls supabase.from(watchlists).delete().eq(id, entryId)', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteWatchlistEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('wl-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('watchlists');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'wl-1');
  });

  it('returns the deleted entry id on success', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteWatchlistEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('wl-2');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe('wl-2');
  });

  it('reports error when supabase delete fails', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteWatchlistEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('wl-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('invalidates [admin, watchlist] query on success', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useDeleteWatchlistEntry(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('wl-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'watchlist'] });
  });
});
