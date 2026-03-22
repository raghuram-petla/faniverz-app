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
  useTheaterMovies,
  useUpcomingMovies,
  useUpcomingRereleases,
  useTheaterSearch,
  useRemoveFromTheaters,
  useAddToTheaters,
} from '@/hooks/useTheaterMovies';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
});

describe('useTheaterMovies', () => {
  it('fetches movies with in_theaters=true', async () => {
    const movies = [{ id: '1', title: 'Theater Movie', in_theaters: true }];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: movies, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useTheaterMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movies');
    expect(result.current.data).toEqual(movies);
  });

  it('returns empty array when no movies are in theaters', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useTheaterMovies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useUpcomingMovies', () => {
  it('fetches movies with future release dates that are not in theaters', async () => {
    const movies = [{ id: '2', title: 'Upcoming Movie', release_date: '2026-12-01' }];
    const mockOrder = vi.fn().mockResolvedValue({ data: movies, error: null });
    const mockLte = vi.fn().mockReturnValue({ order: mockOrder });
    const mockGt = vi.fn().mockReturnValue({ lte: mockLte });
    const mockEq = vi.fn().mockReturnValue({ gt: mockGt });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useUpcomingMovies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movies');
    expect(mockEq).toHaveBeenCalledWith('in_theaters', false);
    expect(result.current.data).toEqual(movies);
  });
});

describe('useUpcomingRereleases', () => {
  it('fetches theatrical runs with future dates', async () => {
    const runs = [
      {
        id: 'r1',
        movie_id: 'm1',
        release_date: '2026-12-15',
        label: 'Re-release',
        movies: { id: 'm1', title: 'Classic Film', poster_url: null, in_theaters: false },
      },
    ];
    const mockOrder = vi.fn().mockResolvedValue({ data: runs, error: null });
    const mockLte = vi.fn().mockReturnValue({ order: mockOrder });
    const mockGt = vi.fn().mockReturnValue({ lte: mockLte });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ gt: mockGt }),
    });

    const { result } = renderHook(() => useUpcomingRereleases(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movie_theatrical_runs');
    expect(result.current.data).toEqual(runs);
  });
});

describe('useTheaterSearch', () => {
  it('is disabled when search is less than 2 characters', () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useTheaterSearch('a'), { wrapper: createWrapper() });
    expect(result.current.isFetching).toBe(false);
  });

  it('searches movies when search >= 2 chars', async () => {
    const results = [{ id: '2', title: 'Test Movie', in_theaters: false }];
    const mockLimit = vi.fn().mockResolvedValue({ data: results, error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockIlike = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ ilike: mockIlike }),
    });

    const { result } = renderHook(() => useTheaterSearch('te'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockIlike).toHaveBeenCalledWith('title', '%te%');
    expect(result.current.data).toEqual(results);
  });
});

describe('useRemoveFromTheaters', () => {
  it('calls crudFetch PATCH for both movie and theatrical run via audit trail', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    // @contract supabase.from().select().eq().is().maybeSingle() chain for finding active run
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'run-1' }, error: null });
    const mockIs = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useRemoveFromTheaters(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ movieId: 'movie-1', endDate: '2026-03-14' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verifies crudFetch was called for both movies and theatrical run
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ table: 'movies', id: 'movie-1', data: { in_theaters: false } }),
      }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_theatrical_runs',
          id: 'run-1',
          data: { end_date: '2026-03-14' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

describe('useAddToTheaters', () => {
  it('calls PATCH on movies + POST on movie_theatrical_runs', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useAddToTheaters(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ movieId: 'movie-1', startDate: '2026-04-01', label: 'Re-release' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ table: 'movies', id: 'movie-1', data: { in_theaters: true } }),
      }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          table: 'movie_theatrical_runs',
          data: { movie_id: 'movie-1', release_date: '2026-04-01', label: 'Re-release' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });

  it('includes premiere_date in PATCH when premiereDate is provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useAddToTheaters(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        movieId: 'movie-1',
        startDate: '2026-03-14',
        label: null,
        premiereDate: '2026-03-14',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movies',
          id: 'movie-1',
          data: { in_theaters: true, premiere_date: '2026-03-14' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });

  it('includes release_date in PATCH when newReleaseDate is provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useAddToTheaters(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        movieId: 'movie-1',
        startDate: '2026-03-14',
        label: null,
        newReleaseDate: '2026-03-14',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movies',
          id: 'movie-1',
          data: { in_theaters: true, release_date: '2026-03-14' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });

  it('sends null label when no label provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useAddToTheaters(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ movieId: 'movie-2', startDate: '2026-05-01', label: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          table: 'movie_theatrical_runs',
          data: { movie_id: 'movie-2', release_date: '2026-05-01', label: null },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});
