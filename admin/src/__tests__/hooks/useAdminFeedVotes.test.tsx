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

import { useAdminFeedVotes, useDeleteFeedVote } from '@/hooks/useAdminFeedVotes';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

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

const mockVotes = [
  {
    id: 'vote-1',
    feed_item_id: 'fi-1',
    user_id: 'usr-1',
    vote_type: 'up',
    created_at: '2024-01-01T00:00:00Z',
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
    feed_item: { id: 'fi-1', title: 'Pushpa 2 Trailer' },
  },
  {
    id: 'vote-2',
    feed_item_id: 'fi-2',
    user_id: 'usr-2',
    vote_type: 'down',
    created_at: '2024-01-02T00:00:00Z',
    profile: { id: 'usr-2', display_name: 'Another User', email: 'another@example.com' },
    feed_item: { id: 'fi-2', title: 'Song Release' },
  },
];

beforeEach(() => {
  mockFrom.mockReset();
});

describe('useAdminFeedVotes', () => {
  it('queries feed_votes and returns data', async () => {
    const { self } = buildChain(mockVotes);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFeedVotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('feed_votes');
    expect(result.current.data).toEqual(mockVotes);
  });

  it('calls select with correct join string', async () => {
    const { self, chain } = buildChain(mockVotes);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFeedVotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.select).toHaveBeenCalledWith(
      '*, profile:profiles(id, display_name, email), feed_item:news_feed(id, title)',
    );
  });

  it('orders by created_at descending', async () => {
    const { self, chain } = buildChain(mockVotes);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFeedVotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('limits results to 200', async () => {
    const { self, chain } = buildChain(mockVotes);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFeedVotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.limit).toHaveBeenCalledWith(200);
  });

  it('filters client-side by profile display_name', async () => {
    const { self } = buildChain(mockVotes);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFeedVotes('Test User'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].profile?.display_name).toBe('Test User');
  });

  it('filters client-side by feed item title', async () => {
    const { self } = buildChain(mockVotes);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFeedVotes('Song'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].feed_item?.title).toBe('Song Release');
  });

  it('filters client-side by vote_type', async () => {
    const { self } = buildChain(mockVotes);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFeedVotes('down'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].vote_type).toBe('down');
  });

  it('is disabled when search has exactly 1 character', async () => {
    const { self } = buildChain(mockVotes);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFeedVotes('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('throws when supabase returns an error', async () => {
    const { self } = buildChain(null, { message: 'Permission denied' });
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminFeedVotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});

describe('useDeleteFeedVote', () => {
  it('calls supabase.from(feed_votes).delete().eq(id, voteId)', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteFeedVote(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('vote-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('feed_votes');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'vote-1');
  });

  it('returns the deleted vote id on success', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteFeedVote(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('vote-2');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe('vote-2');
  });

  it('reports error when supabase delete fails', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteFeedVote(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('vote-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('invalidates [admin, feed-votes] query on success', async () => {
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

    const { result } = renderHook(() => useDeleteFeedVote(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('vote-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'feed-votes'] });
  });
});
