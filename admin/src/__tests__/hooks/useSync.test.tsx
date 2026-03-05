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

// Mock fetch for syncApi calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  useDiscoverMovies,
  useTmdbLookup,
  useImportMovies,
  useRefreshMovie,
  useRefreshActor,
  useStaleItems,
  useMovieSearch,
  useActorSearch,
} from '@/hooks/useSync';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function mockFetchOk(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number, error: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Discover ──────────────────────────────────────────────────────────────────

describe('useDiscoverMovies', () => {
  it('calls POST /api/sync/discover with year and month', async () => {
    const response = { results: [{ id: 1, title: 'Movie' }], existingTmdbIds: [] };
    mockFetchOk(response);

    const { result } = renderHook(() => useDiscoverMovies(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ year: 2025, month: 3 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: 2025, month: 3 }),
    });
    expect(result.current.data).toEqual(response);
  });

  it('throws on API error', async () => {
    mockFetchError(500, 'TMDB rate limit');

    const { result } = renderHook(() => useDiscoverMovies(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ year: 2025 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('TMDB rate limit');
  });
});

// ── Lookup ────────────────────────────────────────────────────────────────────

describe('useTmdbLookup', () => {
  it('calls POST /api/sync/lookup with tmdbId and type', async () => {
    const response = {
      type: 'movie',
      existsInDb: false,
      existingId: null,
      data: { tmdbId: 123, title: 'Test Movie' },
    };
    mockFetchOk(response);

    const { result } = renderHook(() => useTmdbLookup(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ tmdbId: 123, type: 'movie' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId: 123, type: 'movie' }),
    });
    expect(result.current.data).toEqual(response);
  });
});

// ── Import Movies ─────────────────────────────────────────────────────────────

describe('useImportMovies', () => {
  it('calls POST /api/sync/import-movies with tmdbIds array', async () => {
    const response = {
      syncLogId: 'log-1',
      results: [
        { movieId: 'm1', title: 'Movie', tmdbId: 100, isNew: true, castCount: 5, crewCount: 2 },
      ],
      errors: [],
    };
    mockFetchOk(response);

    const { result } = renderHook(() => useImportMovies(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate([100, 200]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/import-movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbIds: [100, 200] }),
    });
  });
});

// ── Refresh Movie ─────────────────────────────────────────────────────────────

describe('useRefreshMovie', () => {
  it('calls POST /api/sync/refresh-movie with movieId', async () => {
    const response = {
      syncLogId: 'log-2',
      result: {
        movieId: 'm1',
        title: 'Movie',
        tmdbId: 100,
        isNew: false,
        castCount: 5,
        crewCount: 2,
      },
    };
    mockFetchOk(response);

    const { result } = renderHook(() => useRefreshMovie(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('movie-uuid');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/refresh-movie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId: 'movie-uuid' }),
    });
  });
});

// ── Refresh Actor ─────────────────────────────────────────────────────────────

describe('useRefreshActor', () => {
  it('calls POST /api/sync/refresh-actor with actorId', async () => {
    const response = {
      syncLogId: 'log-3',
      result: { actorId: 'a1', name: 'Actor', updated: true, fields: ['biography'] },
    };
    mockFetchOk(response);

    const { result } = renderHook(() => useRefreshActor(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('actor-uuid');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/refresh-actor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId: 'actor-uuid' }),
    });
  });
});

// ── Stale Items ───────────────────────────────────────────────────────────────

describe('useStaleItems', () => {
  it('calls GET /api/sync/stale-items with type and days', async () => {
    const response = { type: 'movies', items: [{ id: '1', title: 'Old Movie' }], days: 30 };
    mockFetchOk(response);

    const { result } = renderHook(() => useStaleItems('movies', 30), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/stale-items?type=movies&days=30', {
      method: 'GET',
      headers: {},
      body: undefined,
    });
    expect(result.current.data).toEqual(response);
  });

  it('calls GET /api/sync/stale-items with type only for actors-missing-bios', async () => {
    const response = { type: 'actors-missing-bios', items: [] };
    mockFetchOk(response);

    const { result } = renderHook(() => useStaleItems('actors-missing-bios'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/stale-items?type=actors-missing-bios', {
      method: 'GET',
      headers: {},
      body: undefined,
    });
  });
});

// ── Movie Search ──────────────────────────────────────────────────────────────

describe('useMovieSearch', () => {
  it('queries movies table with ilike when query >= 2 chars', async () => {
    const movies = [{ id: '1', title: 'Pushpa', release_date: '2024-12-05', tmdb_id: 100 }];
    const mockIlike = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: movies, error: null }),
      }),
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: mockIlike,
      }),
    });

    const { result } = renderHook(() => useMovieSearch('Push'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movies');
    expect(mockIlike).toHaveBeenCalledWith('title', '%Push%');
    expect(result.current.data).toEqual(movies);
  });

  it('does not query when query is less than 2 chars', async () => {
    const { result } = renderHook(() => useMovieSearch('P'), { wrapper: createWrapper() });

    // Should not be loading — query is disabled
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── Actor Search ──────────────────────────────────────────────────────────────

describe('useActorSearch', () => {
  it('queries actors table with ilike when query >= 2 chars', async () => {
    const actors = [{ id: '1', name: 'Allu Arjun', tmdb_person_id: 200, photo_url: null }];
    const mockIlike = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: actors, error: null }),
      }),
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: mockIlike,
      }),
    });

    const { result } = renderHook(() => useActorSearch('Allu'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('actors');
    expect(mockIlike).toHaveBeenCalledWith('name', '%Allu%');
    expect(result.current.data).toEqual(actors);
  });

  it('does not query when query is less than 2 chars', async () => {
    const { result } = renderHook(() => useActorSearch('A'), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
  });
});
