import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
  },
}));

import { useBulkFillMissing } from '@/hooks/useBulkFillMissing';
import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const makeMovie = (id: string, overrides: Partial<ExistingMovieData> = {}): ExistingMovieData => ({
  id,
  tmdb_id: Number(id),
  title: 'Movie',
  synopsis: null,
  poster_url: null,
  backdrop_url: null,
  director: null,
  runtime: null,
  genres: null,
  imdb_id: null,
  title_te: null,
  synopsis_te: null,
  tagline: null,
  tmdb_status: null,
  tmdb_vote_average: null,
  tmdb_vote_count: null,
  budget: null,
  revenue: null,
  certification: null,
  spoken_languages: null,
  ...overrides,
});

/** @contract creates TMDB data with all fields populated — mismatches against makeMovie defaults */
const makeTmdb = (tmdbId: number, overrides: Partial<LookupMovieData> = {}): LookupMovieData => ({
  tmdbId,
  title: 'Movie',
  overview: 'A synopsis',
  releaseDate: '2024-01-01',
  runtime: 120,
  genres: ['Action'],
  posterUrl: '/poster.jpg',
  backdropUrl: '/backdrop.jpg',
  director: 'Director',
  castCount: 5,
  crewCount: 3,
  posterCount: 0,
  backdropCount: 0,
  videoCount: 0,
  providerNames: [],
  keywordCount: 0,
  imdbId: null,
  titleTe: null,
  synopsisTe: null,
  tagline: null,
  tmdbStatus: null,
  tmdbVoteAverage: null,
  tmdbVoteCount: null,
  budget: null,
  revenue: null,
  certification: null,
  spokenLanguages: [],
  productionCompanyCount: 0,
  ...overrides,
});

function makeTmdbMap(entries: Array<[number, LookupMovieData]>): Map<number, LookupMovieData> {
  return new Map(entries);
}

function mockFetchOk() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ movieId: 'x', updatedFields: ['synopsis'] }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useBulkFillMissing', () => {
  it('starts with idle state', () => {
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.total).toBe(0);
  });

  it('does nothing when no movies have TMDB mismatches', async () => {
    const movie = makeMovie('1', {
      synopsis: 'A synopsis',
      poster_url: '/poster.jpg',
      backdrop_url: '/backdrop.jpg',
      director: 'Director',
      runtime: 120,
      genres: ['Action'],
      certification: 'UA',
    });
    const tmdb = makeTmdbMap([[1, makeTmdb(1)]]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run([movie], tmdb);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.state.total).toBe(0);
  });

  it('processes only movies with real TMDB mismatches', async () => {
    mockFetchOk();
    mockFetchOk();

    const movies = [makeMovie('1'), makeMovie('2')];
    const tmdb = makeTmdbMap([
      [1, makeTmdb(1)],
      [2, makeTmdb(2)],
    ]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies, tmdb);
    });

    await waitFor(() => expect(result.current.state.isRunning).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.state.done).toBe(2);
  });

  it('counts failures but continues on non-429 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    mockFetchOk();

    const movies = [makeMovie('1'), makeMovie('2')];
    const tmdb = makeTmdbMap([
      [1, makeTmdb(1)],
      [2, makeTmdb(2)],
    ]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies, tmdb);
    });

    await waitFor(() => expect(result.current.state.isRunning).toBe(false));
    expect(result.current.state.done).toBe(1);
    expect(result.current.state.failed).toBe(1);
  });

  it('stops on 429 rate limit and sets error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Rate limited' }),
    });

    const movies = [makeMovie('1'), makeMovie('2')];
    const tmdb = makeTmdbMap([
      [1, makeTmdb(1)],
      [2, makeTmdb(2)],
    ]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies, tmdb);
    });

    await waitFor(() => expect(result.current.state.isRunning).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.error).toContain('Rate limited');
  });

  it('sends only mismatched fields per movie', async () => {
    mockFetchOk();

    // Movie has synopsis and poster missing, everything else matches TMDB
    const movie = makeMovie('101', {
      title: 'Movie',
      synopsis: null,
      poster_url: null,
      backdrop_url: '/backdrop.jpg',
      director: 'Director',
      runtime: 120,
      genres: ['Action'],
    });
    const tmdb = makeTmdbMap([[101, makeTmdb(101)]]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run([movie], tmdb);
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.tmdbId).toBe(101);
    expect(body.fields).toContain('synopsis');
    expect(body.fields).toContain('poster_url');
    expect(body.fields).not.toContain('title');
    expect(body.fields).not.toContain('director');
    expect(body.fields).not.toContain('genres');
  });

  it('reset() clears state to initial', async () => {
    mockFetchOk();
    const tmdb = makeTmdbMap([[1, makeTmdb(1)]]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run([makeMovie('1')], tmdb);
    });

    await waitFor(() => expect(result.current.state.done).toBe(1));

    act(() => result.current.reset());
    expect(result.current.state.done).toBe(0);
    expect(result.current.state.total).toBe(0);
  });

  it('sets error when session is not authenticated', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as never);

    const movies = [makeMovie('1')];
    const tmdb = makeTmdbMap([[1, makeTmdb(1)]]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies, tmdb);
    });

    expect(result.current.state.error).toBe('Not authenticated');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('counts failures when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    mockFetchOk();

    const movies = [makeMovie('1'), makeMovie('2')];
    const tmdb = makeTmdbMap([
      [1, makeTmdb(1)],
      [2, makeTmdb(2)],
    ]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies, tmdb);
    });

    await waitFor(() => expect(result.current.state.isRunning).toBe(false));
    expect(result.current.state.failed).toBe(1);
    expect(result.current.state.done).toBe(1);
  });

  it('uses fallback 429 error message when json error field is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}), // no error field
    });

    const movies = [makeMovie('1')];
    const tmdb = makeTmdbMap([[1, makeTmdb(1)]]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies, tmdb);
    });

    expect(result.current.state.error).toContain('TMDB rate limited');
  });

  it('does nothing when tmdbMap is not provided', async () => {
    const movies = [makeMovie('1')];
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies);
    });

    expect(result.current.state.total).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('reset clears state back to initial', async () => {
    mockFetchOk();
    const movies = [makeMovie('1')];
    const tmdb = makeTmdbMap([[1, makeTmdb(1)]]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies, tmdb);
    });

    expect(result.current.state.total).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.total).toBe(0);
    expect(result.current.state.done).toBe(0);
    expect(result.current.state.failed).toBe(0);
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('handles fetch exception (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const movies = [makeMovie('1')];
    const tmdb = makeTmdbMap([[1, makeTmdb(1)]]);
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies, tmdb);
    });

    expect(result.current.state.failed).toBe(1);
  });

  it('skips movies without TMDB data in the map', async () => {
    const movies = [makeMovie('1'), makeMovie('2')];
    // Only movie 1 has TMDB data
    const tmdb = makeTmdbMap([[1, makeTmdb(1)]]);
    mockFetchOk();
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies, tmdb);
    });

    await waitFor(() => expect(result.current.state.isRunning).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.total).toBe(1);
  });
});
