import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const counts: Record<string, number> = {
        movies: 42,
        actors: 15,
        profiles: 100,
        reviews: 30,
        news_feed: 55,
        watchlist: 200,
        follows: 75,
      };
      return {
        select: vi.fn().mockResolvedValue({ count: counts[table] ?? 0, data: null, error: null }),
      };
    }),
  },
}));

import { useDashboardStats } from '@/hooks/useDashboardStats';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useDashboardStats', () => {
  it('returns totalMovies for regular admin', async () => {
    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const data = result.current.data;
    expect(data).toBeDefined();
    expect(data).toEqual({
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
    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const data = result.current.data!;
    expect(Object.keys(data)).toEqual([
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
