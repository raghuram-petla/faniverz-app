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

import {
  useMovieProductionHouses,
  useAddMovieProductionHouse,
  useRemoveMovieProductionHouse,
} from '@/hooks/useMovieProductionHouses';

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

beforeEach(() => {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
});

describe('useMovieProductionHouses', () => {
  it('fetches production houses with joined relation for a movieId', async () => {
    const mockData = [
      {
        movie_id: 'm1',
        production_house_id: 'ph1',
        production_house: { id: 'ph1', name: 'Arka Media Works' },
      },
      {
        movie_id: 'm1',
        production_house_id: 'ph2',
        production_house: { id: 'ph2', name: 'Mythri Movie Makers' },
      },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMovieProductionHouses('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_production_houses');
    expect(mockEq).toHaveBeenCalledWith('movie_id', 'm1');
    expect(result.current.data).toEqual(mockData);
  });

  it('is disabled when movieId is empty', () => {
    const { result } = renderHook(() => useMovieProductionHouses(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useAddMovieProductionHouse', () => {
  it('inserts a junction row via /api/admin-crud linking movie and production house', async () => {
    const fetchSpy = mockCrudApi({ movieId: 'm1', productionHouseId: 'ph1' });

    const { result } = renderHook(() => useAddMovieProductionHouse(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movieId: 'm1', productionHouseId: 'ph1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          table: 'movie_production_houses',
          data: { movie_id: 'm1', production_house_id: 'ph1' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

describe('useRemoveMovieProductionHouse', () => {
  it('deletes a junction row via /api/admin-crud with filter', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useRemoveMovieProductionHouse(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movieId: 'm1', productionHouseId: 'ph1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({
          table: 'movie_production_houses',
          filters: { movie_id: 'm1', production_house_id: 'ph1' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});
