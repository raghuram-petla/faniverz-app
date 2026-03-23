import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();

// @boundary syncApi calls supabase.auth.getSession() for Bearer token —
// must be mocked or all syncApi-backed hooks fail with TypeError before fetch
vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
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
  useFillFields,
} from '@/hooks/useSync';

// All syncApi calls include Authorization: Bearer test-token
const AUTH_HEADER = { Authorization: 'Bearer test-token' };

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
    const response = { results: [{ id: 1, title: 'Movie' }], existingMovies: [] };
    mockFetchOk(response);

    const { result } = renderHook(() => useDiscoverMovies(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ year: 2025, month: 3 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/discover', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
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
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
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
        {
          movieId: 'm1',
          title: 'Movie',
          tmdbId: 100,
          isNew: true,
          castCount: 5,
          crewCount: 2,
          posterCount: 10,
          backdropCount: 3,
        },
      ],
      errors: [],
    };
    mockFetchOk(response);

    const { result } = renderHook(() => useImportMovies(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ tmdbIds: [100, 200], originalLanguage: 'te' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/import-movies', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbIds: [100, 200], originalLanguage: 'te' }),
    });
  });

  it('does not have onError handler (handled by DiscoverByYear retry loop)', async () => {
    // Mock window.alert to verify it's NOT called on import error
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockFetchError(504, 'Gateway timeout');

    const { result } = renderHook(() => useImportMovies(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ tmdbIds: [100] });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // useImportMovies should NOT show an alert (no onError handler)
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('attaches HTTP status code to error object', async () => {
    mockFetchError(504, 'Gateway timeout');

    const { result } = renderHook(() => useImportMovies(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ tmdbIds: [100] });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // syncApi attaches .status to the Error object
    const error = result.current.error as Error & { status?: number };
    expect(error.status).toBe(504);
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
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
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
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
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
      headers: { ...AUTH_HEADER },
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
      headers: { ...AUTH_HEADER },
      body: undefined,
    });
  });
});

// ── Fill Fields ───────────────────────────────────────────────────────────────

describe('useFillFields', () => {
  it('calls POST /api/sync/fill-fields with tmdbId and fields', async () => {
    const response = { movieId: 'uuid-1', updatedFields: ['synopsis', 'director'] };
    mockFetchOk(response);

    const { result } = renderHook(() => useFillFields(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ tmdbId: 101, fields: ['synopsis', 'director'] });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/fill-fields', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId: 101, fields: ['synopsis', 'director'] }),
    });
    expect(result.current.data).toEqual(response);
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

// ── syncApi edge cases ────────────────────────────────────────────────────────

describe('syncApi — session expired (401)', () => {
  it('throws session expired error on 401 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthorized' }),
    });

    const { result } = renderHook(() => useDiscoverMovies(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ year: 2025 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Session expired');
  });
});

describe('syncApi — no session', () => {
  it('throws when getSession returns null session', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as never);

    const { result } = renderHook(() => useDiscoverMovies(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ year: 2025 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Session expired');
  });
});

describe('syncApi — non-JSON error response', () => {
  it('handles non-JSON error body gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    });

    const { result } = renderHook(() => useDiscoverMovies(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ year: 2025 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Sync API error: 500');
  });
});

// ── useStaleItems with sinceYear ──────────────────────────────────────────────

describe('useStaleItems — sinceYear parameter', () => {
  it('includes sinceYear in query params', async () => {
    const response = { type: 'movies', items: [], days: 30 };
    mockFetchOk(response);

    const { result } = renderHook(() => useStaleItems('movies', 30, 2020), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sync/stale-items?type=movies&days=30&sinceYear=2020',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

// ── useLinkTmdbId ─────────────────────────────────────────────────────────────

import { useLinkTmdbId, useImportActor, useTmdbSearch } from '@/hooks/useSync';

describe('useLinkTmdbId', () => {
  it('calls PATCH /api/admin-crud to link TMDB ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'm1', tmdb_id: 999 }),
    });

    const { result } = renderHook(() => useLinkTmdbId(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ movieId: 'm1', tmdbId: 999 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ table: 'movies', id: 'm1', data: { tmdb_id: 999 } }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Already linked' }),
    });

    const { result } = renderHook(() => useLinkTmdbId(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ movieId: 'm1', tmdbId: 999 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('throws when session is expired', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { supabase } = await import('@/lib/supabase-browser');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as never);

    const { result } = renderHook(() => useLinkTmdbId(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ movieId: 'm1', tmdbId: 999 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Session expired');
    alertSpy.mockRestore();
  });
});

// ── useImportActor ────────────────────────────────────────────────────────────

describe('useImportActor', () => {
  it('calls POST /api/sync/import-actor', async () => {
    const response = {
      syncLogId: 'log-4',
      result: { actorId: 'a1', name: 'Actor', tmdbPersonId: 12345 },
    };
    mockFetchOk(response);

    const { result } = renderHook(() => useImportActor(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(12345);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/sync/import-actor', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbPersonId: 12345 }),
    });
  });

  it('shows alert on error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockFetchError(500, 'Import failed');

    const { result } = renderHook(() => useImportActor(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(12345);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

// ── useTmdbSearch ─────────────────────────────────────────────────────────────

describe('useTmdbSearch', () => {
  it('calls POST /api/sync/search with query', async () => {
    const response = { movies: [], persons: [] };
    mockFetchOk(response);

    const { result } = renderHook(() => useTmdbSearch(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ query: 'Pushpa' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/sync/search', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Pushpa' }),
    });
  });

  it('shows alert on search error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockFetchError(500, 'Search failed');

    const { result } = renderHook(() => useTmdbSearch(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ query: 'Test' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
