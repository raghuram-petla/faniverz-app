jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
        in: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  },
}));

jest.mock('../api', () => ({
  fetchProductionHouseById: jest.fn().mockResolvedValue({
    id: 'ph1',
    name: 'Test Studio',
    logo_url: null,
    description: 'A studio',
    created_at: '2026-01-01T00:00:00Z',
  }),
  fetchProductionHouseMovies: jest
    .fn()
    .mockResolvedValue([
      { id: 'm1', title: 'Movie 1', poster_url: null, release_date: '2026-01-01', rating: 8 },
    ]),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useProductionHouses,
  useMovieIdsByProductionHouse,
  useProductionHouseDetail,
} from '../hooks';

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useProductionHouses', () => {
  it('returns production houses', async () => {
    const { result } = renderHook(() => useProductionHouses(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useMovieIdsByProductionHouse', () => {
  it('is disabled when no IDs', () => {
    const { result } = renderHook(() => useMovieIdsByProductionHouse([]), {
      wrapper: createWrapper(),
    });
    expect(result.current.isFetching).toBe(false);
  });
});

describe('useProductionHouseDetail', () => {
  it('returns house and movies', async () => {
    const { result } = renderHook(() => useProductionHouseDetail('ph1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.house).toEqual(
      expect.objectContaining({ id: 'ph1', name: 'Test Studio' }),
    );
    expect(result.current.movies).toHaveLength(1);
  });

  it('returns null house when id is empty', () => {
    const { result } = renderHook(() => useProductionHouseDetail(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.house).toBeNull();
    expect(result.current.movies).toEqual([]);
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useProductionHouseDetail('ph1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });
});
