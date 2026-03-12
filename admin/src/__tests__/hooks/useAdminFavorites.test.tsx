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

import { useAdminFavorites, useDeleteFavorite } from '@/hooks/useAdminFavorites';

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

const mockFavorites = [
  {
    id: 'fav-1',
    user_id: 'usr-1',
    actor_id: 'act-1',
    created_at: '2024-01-01T00:00:00Z',
    actor: { id: 'act-1', name: 'Mahesh Babu', photo_url: 'https://example.com/mb.jpg' },
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'fav-2',
    user_id: 'usr-2',
    actor_id: 'act-2',
    created_at: '2024-01-02T00:00:00Z',
    actor: { id: 'act-2', name: 'Prabhas', photo_url: null },
    profile: { id: 'usr-2', display_name: 'Another User', email: 'another@example.com' },
  },
];

beforeEach(() => {
  mockFrom.mockReset();
});

describe('useAdminFavorites', () => {
  it('queries favorite_actors and returns data', async () => {
    const { self } = buildChain(mockFavorites);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFavorites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('favorite_actors');
    expect(result.current.data).toEqual(mockFavorites);
  });

  it('calls select with correct join string', async () => {
    const { self, chain } = buildChain(mockFavorites);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFavorites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.select).toHaveBeenCalledWith(
      '*, actor:actors(id, name, photo_url), profile:profiles(id, display_name, email)',
    );
  });

  it('orders by created_at descending', async () => {
    const { self, chain } = buildChain(mockFavorites);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFavorites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('limits results to 200', async () => {
    const { self, chain } = buildChain(mockFavorites);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFavorites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.limit).toHaveBeenCalledWith(200);
  });

  it('includes search in query key', async () => {
    const { self } = buildChain(mockFavorites);
    mockFrom.mockReturnValue(self);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAdminFavorites('Mahesh'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeTruthy();
  });

  it('returns empty array when no favorites exist', async () => {
    const { self } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFavorites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('throws when supabase returns an error', async () => {
    const { self } = buildChain(null, { message: 'Permission denied' });
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFavorites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('filters client-side by actor name when searching', async () => {
    const { self } = buildChain(mockFavorites);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFavorites('Mahesh'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].actor?.name).toBe('Mahesh Babu');
  });

  it('filters client-side by profile display_name when searching', async () => {
    const { self } = buildChain(mockFavorites);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFavorites('Another'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].profile?.display_name).toBe('Another User');
  });

  it('is disabled when search has exactly 1 character', async () => {
    const { self } = buildChain(mockFavorites);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFavorites('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useDeleteFavorite', () => {
  it('calls supabase.from(favorite_actors).delete().eq(id, favId)', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteFavorite(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('fav-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('favorite_actors');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'fav-1');
  });

  it('returns the deleted favorite id on success', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteFavorite(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('fav-2');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe('fav-2');
  });

  it('reports error when supabase delete fails', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteFavorite(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('fav-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('invalidates [admin, favorites] query on success', async () => {
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

    const { result } = renderHook(() => useDeleteFavorite(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('fav-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'favorites'] });
  });
});
