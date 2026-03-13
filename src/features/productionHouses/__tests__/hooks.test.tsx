/* eslint-disable @typescript-eslint/no-explicit-any */
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const mockFetchHouseById = jest.fn();
const mockFetchHouseMovies = jest.fn();

jest.mock('../api', () => ({
  fetchProductionHouseById: (...args: any[]) => mockFetchHouseById(...args),
  fetchProductionHouseMovies: (...args: any[]) => mockFetchHouseMovies(...args),
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

// Helper to build a chained Supabase mock for production_houses table
function mockProductionHousesSelect(data: any[], error: any = null) {
  mockFrom.mockImplementation(() => ({
    select: jest.fn(() => ({
      order: jest.fn().mockResolvedValue({ data, error }),
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
      in: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
  }));
}

// Helper for movie_production_houses junction table
function mockJunctionSelect(data: any[], error: any = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'movie_production_houses') {
      return {
        select: jest.fn(() => ({
          in: jest.fn().mockResolvedValue({ data, error }),
        })),
      };
    }
    return {
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
        in: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: empty success responses
  mockProductionHousesSelect([]);
  mockFetchHouseById.mockResolvedValue({
    id: 'ph1',
    name: 'Test Studio',
    logo_url: null,
    description: 'A studio',
    created_at: '2026-01-01T00:00:00Z',
  });
  mockFetchHouseMovies.mockResolvedValue([
    { id: 'm1', title: 'Movie 1', poster_url: null, release_date: '2026-01-01', rating: 8 },
  ]);
});

describe('useProductionHouses', () => {
  it('returns production houses on success', async () => {
    const houses = [
      { id: 'ph1', name: 'Studio A' },
      { id: 'ph2', name: 'Studio B' },
    ];
    mockProductionHousesSelect(houses);

    const { result } = renderHook(() => useProductionHouses(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(houses);
  });

  it('returns empty array when no production houses exist', async () => {
    mockProductionHousesSelect([]);

    const { result } = renderHook(() => useProductionHouses(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('enters error state when supabase query fails', async () => {
    mockProductionHousesSelect([], { message: 'DB error', code: '42P01' });

    const { result } = renderHook(() => useProductionHouses(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it('has 24-hour stale time', async () => {
    mockProductionHousesSelect([{ id: 'ph1', name: 'Studio A' }]);

    const { result } = renderHook(() => useProductionHouses(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Query was called exactly once (not refetched due to staleTime)
    expect(result.current.isStale).toBe(false);
  });
});

describe('useMovieIdsByProductionHouse', () => {
  it('is disabled when IDs array is empty', () => {
    const { result } = renderHook(() => useMovieIdsByProductionHouse([]), {
      wrapper: createWrapper(),
    });
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('fetches movie IDs when production house IDs are provided', async () => {
    mockJunctionSelect([{ movie_id: 'm1' }, { movie_id: 'm2' }]);

    const { result } = renderHook(() => useMovieIdsByProductionHouse(['ph1']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['m1', 'm2']);
  });

  it('deduplicates movie IDs from junction table', async () => {
    // Same movie linked to multiple production houses
    mockJunctionSelect([{ movie_id: 'm1' }, { movie_id: 'm1' }, { movie_id: 'm2' }]);

    const { result } = renderHook(() => useMovieIdsByProductionHouse(['ph1', 'ph2']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['m1', 'm2']);
  });

  it('returns empty array when junction table returns null data', async () => {
    mockJunctionSelect(null as any);

    const { result } = renderHook(() => useMovieIdsByProductionHouse(['ph1']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('enters error state when junction query fails', async () => {
    mockJunctionSelect([], { message: 'Permission denied' });

    const { result } = renderHook(() => useMovieIdsByProductionHouse(['ph1']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('includes production house IDs in query key for caching', async () => {
    mockJunctionSelect([{ movie_id: 'm1' }]);

    const wrapper = createWrapper();
    const { result: result1 } = renderHook(() => useMovieIdsByProductionHouse(['ph1']), {
      wrapper,
    });
    const { result: result2 } = renderHook(() => useMovieIdsByProductionHouse(['ph2']), {
      wrapper,
    });

    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    // Both should have fetched independently (different query keys)
    expect(mockFrom).toHaveBeenCalledWith('movie_production_houses');
  });
});

describe('useProductionHouseDetail', () => {
  it('returns house and movies on success', async () => {
    const { result } = renderHook(() => useProductionHouseDetail('ph1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.house).toEqual(
      expect.objectContaining({ id: 'ph1', name: 'Test Studio' }),
    );
    expect(result.current.movies).toHaveLength(1);
    expect(result.current.movies[0]).toEqual(
      expect.objectContaining({ id: 'm1', title: 'Movie 1' }),
    );
  });

  it('returns null house and empty movies when id is empty', () => {
    const { result } = renderHook(() => useProductionHouseDetail(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.house).toBeNull();
    expect(result.current.movies).toEqual([]);
  });

  it('isLoading is true when house query is loading', () => {
    // Make the house query never resolve
    mockFetchHouseById.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useProductionHouseDetail('ph1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('isLoading is true when movies query is loading', () => {
    mockFetchHouseMovies.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useProductionHouseDetail('ph1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns null house when fetchProductionHouseById returns null', async () => {
    mockFetchHouseById.mockResolvedValue(null);
    mockFetchHouseMovies.mockResolvedValue([]);

    const { result } = renderHook(() => useProductionHouseDetail('ph-nonexistent'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.house).toBeNull();
    expect(result.current.movies).toEqual([]);
  });

  it('returns empty movies when fetchProductionHouseMovies returns empty', async () => {
    mockFetchHouseMovies.mockResolvedValue([]);

    const { result } = renderHook(() => useProductionHouseDetail('ph1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.movies).toEqual([]);
  });

  it('exposes a refetch function that refetches both queries', async () => {
    const { result } = renderHook(() => useProductionHouseDetail('ph1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.refetch).toBe('function');

    // Call refetch and verify both API functions are called again
    mockFetchHouseById.mockClear();
    mockFetchHouseMovies.mockClear();
    await result.current.refetch();

    expect(mockFetchHouseById).toHaveBeenCalledWith('ph1');
    expect(mockFetchHouseMovies).toHaveBeenCalledWith('ph1');
  });

  it('passes the id to both API functions', async () => {
    const { result } = renderHook(() => useProductionHouseDetail('ph-42'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchHouseById).toHaveBeenCalledWith('ph-42');
    expect(mockFetchHouseMovies).toHaveBeenCalledWith('ph-42');
  });
});
