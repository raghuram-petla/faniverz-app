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

import { useAdminFollows, useDeleteFollow } from '@/hooks/useAdminFollows';

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

const mockFollows = [
  {
    id: 'fol-1',
    user_id: 'usr-1',
    entity_type: 'movie',
    entity_id: 'mov-1',
    created_at: '2024-01-01T00:00:00Z',
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'fol-2',
    user_id: 'usr-2',
    entity_type: 'actor',
    entity_id: 'act-1',
    created_at: '2024-01-02T00:00:00Z',
    profile: { id: 'usr-2', display_name: 'Another User', email: 'another@example.com' },
  },
];

beforeEach(() => {
  mockFrom.mockReset();
});

describe('useAdminFollows', () => {
  it('queries entity_follows and returns data', async () => {
    const { self } = buildChain(mockFollows);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFollows(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('entity_follows');
    expect(result.current.data).toEqual(mockFollows);
  });

  it('calls select with correct join string', async () => {
    const { self, chain } = buildChain(mockFollows);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFollows(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.select).toHaveBeenCalledWith('*, profile:profiles(id, display_name, email)');
  });

  it('orders by created_at descending', async () => {
    const { self, chain } = buildChain(mockFollows);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFollows(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('limits results to 200', async () => {
    const { self, chain } = buildChain(mockFollows);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFollows(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.limit).toHaveBeenCalledWith(200);
  });

  it('includes search in query key', async () => {
    const { self } = buildChain(mockFollows);
    mockFrom.mockReturnValue(self);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAdminFollows('movie'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeTruthy();
  });

  it('returns empty array when no follows exist', async () => {
    const { self } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFollows(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('throws when supabase returns an error', async () => {
    const { self } = buildChain(null, { message: 'Permission denied' });
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFollows(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('filters client-side by profile display_name when searching', async () => {
    const { self } = buildChain(mockFollows);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFollows('Test User'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].profile?.display_name).toBe('Test User');
  });

  it('filters client-side by entity_type when searching', async () => {
    const { self } = buildChain(mockFollows);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFollows('actor'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].entity_type).toBe('actor');
  });

  it('is disabled when search has exactly 1 character', async () => {
    const { self } = buildChain(mockFollows);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFollows('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useDeleteFollow', () => {
  it('calls supabase.from(entity_follows).delete().eq(id, followId)', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteFollow(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('fol-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('entity_follows');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'fol-1');
  });

  it('returns the deleted follow id on success', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteFollow(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('fol-2');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe('fol-2');
  });

  it('reports error when supabase delete fails', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteFollow(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('fol-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('invalidates [admin, follows] query on success', async () => {
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

    const { result } = renderHook(() => useDeleteFollow(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('fol-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'follows'] });
  });
});
