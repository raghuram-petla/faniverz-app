import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
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

    const mockEq = vi.fn().mockResolvedValue({ data: mockData, error: null });

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
  it('inserts a junction row linking movie and production house', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useAddMovieProductionHouse(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movieId: 'm1', productionHouseId: 'ph1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_production_houses');
    expect(mockInsert).toHaveBeenCalledWith({
      movie_id: 'm1',
      production_house_id: 'ph1',
    });
  });
});

describe('useRemoveMovieProductionHouse', () => {
  it('deletes a junction row with two eq filters', async () => {
    const mockEqHouse = vi.fn().mockResolvedValue({ error: null });
    const mockEqMovie = vi.fn().mockReturnValue({ eq: mockEqHouse });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqMovie });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useRemoveMovieProductionHouse(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movieId: 'm1', productionHouseId: 'ph1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_production_houses');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEqMovie).toHaveBeenCalledWith('movie_id', 'm1');
    expect(mockEqHouse).toHaveBeenCalledWith('production_house_id', 'ph1');
  });
});
