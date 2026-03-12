import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

/* ---------- hoisted mock state ---------- */
const { fromSpy } = vi.hoisted(() => {
  return { fromSpy: vi.fn() };
});

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { from: fromSpy },
}));

import { useDashboardStats } from '@/hooks/useDashboardStats';

/* ---------- helpers ---------- */
type MockResult = { count: number | null; data: unknown[] | null; error: unknown };

function chainable(resolved: MockResult) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (v: MockResult) => void) => resolve(resolved));
  return chain;
}

function setupGlobalAdminMock() {
  const counts: Record<string, number> = {
    movies: 42,
    actors: 15,
    profiles: 100,
    reviews: 30,
    news_feed: 55,
    watchlists: 200,
    entity_follows: 75,
  };
  fromSpy.mockImplementation((table: string) =>
    chainable({ count: counts[table] ?? 0, data: null, error: null }),
  );
}

function setupPHAdminMock(movieIds: string[], actorIds: string[]) {
  const junctionData = movieIds.map((id) => ({ movie_id: id }));
  const castData = actorIds.map((id) => ({ actor_id: id }));

  const tableResults: Record<string, MockResult> = {
    movie_production_houses: { count: null, data: junctionData, error: null },
    movie_cast: { count: null, data: castData, error: null },
    reviews: { count: 5, data: null, error: null },
    news_feed: { count: 8, data: null, error: null },
    watchlists: { count: 12, data: null, error: null },
    entity_follows: { count: 3, data: null, error: null },
  };

  fromSpy.mockImplementation((table: string) => {
    const result = tableResults[table] ?? { count: 0, data: null, error: null };
    return chainable(result);
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('global admin (no productionHouseIds)', () => {
    it('returns all stats from estimated counts', async () => {
      setupGlobalAdminMock();
      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual({
        totalMovies: 42,
        totalActors: 15,
        totalUsers: 100,
        totalReviews: 30,
        totalFeedItems: 55,
        totalWatchlistEntries: 200,
        totalFollows: 75,
      });
    });

    it('has all stat fields in returned data', async () => {
      setupGlobalAdminMock();
      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(Object.keys(result.current.data!)).toEqual([
        'totalMovies',
        'totalActors',
        'totalUsers',
        'totalReviews',
        'totalFeedItems',
        'totalWatchlistEntries',
        'totalFollows',
      ]);
    });
  });

  describe('PH admin (with productionHouseIds)', () => {
    it('returns scoped stats for PH movies', async () => {
      setupPHAdminMock(['m1', 'm2', 'm3'], ['a1', 'a2']);
      const { result } = renderHook(() => useDashboardStats(['ph-1']), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual({
        totalMovies: 3,
        totalActors: 2,
        totalUsers: 0,
        totalReviews: 5,
        totalFeedItems: 8,
        totalWatchlistEntries: 12,
        totalFollows: 3,
      });
    });

    it('deduplicates actor IDs from movie_cast', async () => {
      // Two cast rows with same actor_id -> should count as 2 unique via Set
      setupPHAdminMock(['m1'], ['a1', 'a1', 'a2']);
      const { result } = renderHook(() => useDashboardStats(['ph-1']), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data!.totalActors).toBe(2);
    });

    it('returns all zeros when PH has no movies', async () => {
      setupPHAdminMock([], []);
      const { result } = renderHook(() => useDashboardStats(['ph-1']), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual({
        totalMovies: 0,
        totalActors: 0,
        totalUsers: 0,
        totalReviews: 0,
        totalFeedItems: 0,
        totalWatchlistEntries: 0,
        totalFollows: 0,
      });
    });

    it('always returns 0 for totalUsers', async () => {
      setupPHAdminMock(['m1'], ['a1']);
      const { result } = renderHook(() => useDashboardStats(['ph-1']), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data!.totalUsers).toBe(0);
    });

    it('queries movie_production_houses with the provided PH IDs', async () => {
      setupPHAdminMock(['m1'], []);
      renderHook(() => useDashboardStats(['ph-A', 'ph-B']), { wrapper: createWrapper() });
      await waitFor(() => expect(fromSpy).toHaveBeenCalledWith('movie_production_houses'));
    });
  });

  describe('error handling', () => {
    it('propagates junction query error', async () => {
      fromSpy.mockImplementation(() =>
        chainable({ count: null, data: null, error: { message: 'fail' } }),
      );

      const { result } = renderHook(() => useDashboardStats(['ph-1']), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual({ message: 'fail' });
    });
  });
});
