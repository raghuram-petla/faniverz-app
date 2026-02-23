import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabase-browser', () => {
  const selectMock = vi.fn().mockImplementation(() => ({
    gte: vi.fn().mockResolvedValue({ count: 3, data: null, error: null }),
    eq: vi.fn().mockResolvedValue({ count: 1, data: null, error: null }),
  }));

  // For movies and profiles (no chained filter), resolve with count directly
  selectMock
    .mockResolvedValueOnce({ count: 42, data: null, error: null }) // movies
    .mockResolvedValueOnce({ count: 100, data: null, error: null }) // profiles
    .mockReturnValueOnce({
      // reviews -> .gte()
      gte: vi.fn().mockResolvedValue({ count: 5, data: null, error: null }),
    })
    .mockReturnValueOnce({
      // notifications -> .eq()
      eq: vi.fn().mockResolvedValue({ count: 2, data: null, error: null }),
    });

  return {
    supabase: {
      from: vi.fn(() => ({
        select: selectMock,
      })),
    },
  };
});

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
  it('returns data with DashboardStats shape', async () => {
    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    // Wait for the query to finish loading
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The hook should return an object with the DashboardStats keys
    const data = result.current.data;
    expect(data).toBeDefined();
    expect(data).toHaveProperty('totalMovies');
    expect(data).toHaveProperty('totalUsers');
    expect(data).toHaveProperty('reviewsToday');
    expect(data).toHaveProperty('activeNotifications');
    expect(typeof data!.totalMovies).toBe('number');
    expect(typeof data!.totalUsers).toBe('number');
    expect(typeof data!.reviewsToday).toBe('number');
    expect(typeof data!.activeNotifications).toBe('number');
  });
});
