import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/query-config', () => ({
  ADMIN_STALE_5M: 300_000,
}));

import { useDashboardStats } from '@/hooks/useDashboardStats';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

// Helper to build a select chain that resolves with count
function makeCountChain(count: number) {
  return {
    select: vi.fn().mockResolvedValue({ count, error: null }),
  };
}

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all 6 counts for super-admin (no PH scope)', async () => {
    mockFrom.mockImplementation(() => makeCountChain(10));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStats(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      totalMovies: 10,
      totalActors: 10,
      totalUsers: 10,
      totalReviews: 10,
      totalFeedItems: 10,
      totalComments: 10,
    });
  });

  it('returns zero stats when PH scope has no movies', async () => {
    const phChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(phChain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStats(['ph-1']), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      totalMovies: 0,
      totalActors: 0,
      totalUsers: 0,
      totalReviews: 0,
      totalFeedItems: 0,
      totalComments: 0,
    });
  });

  it('throws when PH junction query fails', async () => {
    const phChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: null, error: new Error('PH query failed') }),
    };
    mockFrom.mockReturnValue(phChain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStats(['ph-1']), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('fetches PH-scoped stats with feedItemIds for comments', async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ movie_id: 'm1' }, { movie_id: 'm2' }],
            error: null,
          }),
        };
      }
      if (table === 'news_feed') {
        callCount++;
        if (callCount === 1) {
          // feed items query for IDs
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [{ id: 'f1' }], error: null }),
          };
        }
        // feed items count
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ count: 5, error: null }),
        };
      }
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ actor_id: 'a1' }, { actor_id: 'a2' }, { actor_id: 'a1' }],
            error: null,
          }),
        };
      }
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ count: 3, error: null }),
        };
      }
      if (table === 'feed_comments') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ count: 2, error: null }),
        };
      }
      return makeCountChain(0);
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStats(['ph-1']), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalMovies).toBe(2);
    expect(result.current.data?.totalActors).toBe(2); // deduplicated a1
    expect(result.current.data?.totalUsers).toBe(0); // PH admins get 0
  });

  it('returns 0 comments when feedItemIds is empty (PH scope)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ movie_id: 'm1' }],
            error: null,
          }),
        };
      }
      if (table === 'news_feed') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        };
      }
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ count: 0, error: null }),
        };
      }
      return makeCountChain(0);
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStats(['ph-1']), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalComments).toBe(0);
  });

  it('handles null counts via nullish coalesce', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({ count: null, error: null }),
    }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStats(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalMovies).toBe(0);
    expect(result.current.data?.totalActors).toBe(0);
  });

  it('handles null junctionData via nullish coalesce in PH scope', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return makeCountChain(0);
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStats(['ph-1']), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // null data → [] via ?? → movieIds.length === 0 → zeroes
    expect(result.current.data?.totalMovies).toBe(0);
  });

  it('handles null castData via nullish coalesce in PH scope', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ movie_id: 'm1' }],
            error: null,
          }),
        };
      }
      if (table === 'news_feed') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        };
      }
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ count: null, error: null }),
        };
      }
      return makeCountChain(0);
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStats(['ph-1']), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalActors).toBe(0);
    expect(result.current.data?.totalReviews).toBe(0);
  });

  it('handles null feedItemData in PH scope (feedItemIds = empty)', async () => {
    let newsFeedCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [{ movie_id: 'm1' }], error: null }),
        };
      }
      if (table === 'news_feed') {
        newsFeedCallCount++;
        if (newsFeedCallCount === 1) {
          // First call: get feed item IDs — return null data to trigger ?? []
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        // Second call: count
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ count: null, error: null }),
        };
      }
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ count: 0, error: null }),
        };
      }
      return makeCountChain(0);
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStats(['ph-1']), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // feedItemData is null → feedItemIds = [] → comments = 0 via Promise.resolve({ count: 0 })
    expect(result.current.data?.totalComments).toBe(0);
    expect(result.current.data?.totalFeedItems).toBe(0);
  });

  it('uses empty productionHouseIds same as no scope', async () => {
    mockFrom.mockImplementation(() => makeCountChain(5));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStats([]), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Empty array => hasPHScope is false => super-admin path
    expect(result.current.data?.totalMovies).toBe(5);
  });
});
