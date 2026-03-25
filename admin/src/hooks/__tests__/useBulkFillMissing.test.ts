import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
  },
}));

vi.mock('@/components/sync/fieldDiffHelpers', () => ({
  getStatus: vi.fn(),
}));

vi.mock('@/lib/syncUtils', () => ({
  FILLABLE_DATA_FIELDS: ['title', 'synopsis', 'poster_url'],
}));

import { useBulkFillMissing } from '@/hooks/useBulkFillMissing';
import { supabase } from '@/lib/supabase-browser';
import { getStatus } from '@/components/sync/fieldDiffHelpers';
import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';

const mockGetSession = vi.mocked(supabase.auth.getSession);
const mockGetStatus = vi.mocked(getStatus);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const makeMovie = (tmdbId: number): ExistingMovieData => ({
  id: `db-${tmdbId}`,
  tmdb_id: tmdbId,
  title: `Movie ${tmdbId}`,
  synopsis: null,
  release_date: null,
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
});

const makeTmdb = (): LookupMovieData =>
  ({
    tmdbId: 1,
    title: 'TMDB Title',
    overview: 'Overview',
    posterUrl: 'https://tmdb/poster.jpg',
  }) as LookupMovieData;

describe('useBulkFillMissing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    } as never);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    expect(result.current.state).toEqual({
      total: 0,
      done: 0,
      failed: 0,
      isRunning: false,
      error: null,
    });
  });

  it('does nothing when no movies have gaps', async () => {
    mockGetStatus.mockReturnValue('same');
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>([[1, makeTmdb()]]);

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    expect(result.current.state.total).toBe(0);
    expect(global.fetch).not.toHaveBeenCalledWith('/api/sync/fill-fields', expect.anything());
  });

  it('processes movies with gaps and calls fill-fields API', async () => {
    // getGappedFields is called twice: once in filter, once in loop body
    // Each call checks 3 fields (FILLABLE_DATA_FIELDS has 3 entries)
    // Need at least one 'missing' in both calls
    mockGetStatus.mockImplementation(() => 'missing');
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>([[1, makeTmdb()]]);

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    expect(result.current.state.done).toBe(1);
    expect(result.current.state.isRunning).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/sync/fill-fields',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sets error when not authenticated', async () => {
    mockGetStatus.mockReturnValue('missing');
    mockGetSession.mockResolvedValue({
      data: { session: null },
    } as never);

    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>([[1, makeTmdb()]]);

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    expect(result.current.state.error).toBe('Not authenticated');
  });

  it('skips movie with 0 gapped fields on second check', async () => {
    // First check: getGappedFields returns ['title'] (1 field)
    // Second check in the loop: getGappedFields returns [] (0 fields)
    let callCount = 0;
    mockGetStatus.mockImplementation(() => {
      callCount++;
      // First 3 calls: during initial filter (3 fields checked) — 1 returns 'missing'
      if (callCount <= 3) return callCount === 1 ? 'missing' : 'same';
      // Next 3 calls: during the loop — all return 'same' (no fields to fill)
      return 'same';
    });

    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>([[1, makeTmdb()]]);

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    // Movie was counted but skipped (done incremented, no fetch)
    expect(result.current.state.done).toBe(1);
  });

  it('handles 429 rate limit response', async () => {
    mockGetStatus.mockReturnValue('missing');
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Rate limited' }),
    } as Response);

    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>([[1, makeTmdb()]]);

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    expect(result.current.state.error).toBe('Rate limited');
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.failed).toBe(1);
  });

  it('handles non-429 error response', async () => {
    mockGetStatus.mockReturnValue('missing');
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>([[1, makeTmdb()]]);

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    expect(result.current.state.failed).toBe(1);
    expect(result.current.state.isRunning).toBe(false);
  });

  it('handles fetch exception', async () => {
    mockGetStatus.mockReturnValue('missing');
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>([[1, makeTmdb()]]);

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    expect(result.current.state.failed).toBe(1);
  });

  it('skips movie when tmdb data is not in tmdbMap', async () => {
    mockGetStatus.mockReturnValue('same');
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>();

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    expect(result.current.state.total).toBe(0);
  });

  it('reset restores initial state', async () => {
    mockGetStatus.mockReturnValue('missing');
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>([[1, makeTmdb()]]);

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    expect(result.current.state.done).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({
      total: 0,
      done: 0,
      failed: 0,
      isRunning: false,
      error: null,
    });
  });

  it('handles 429 with fallback error message', async () => {
    mockGetStatus.mockReturnValue('missing');
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}), // no error key
    } as Response);

    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>([[1, makeTmdb()]]);

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    expect(result.current.state.error).toBe('TMDB rate limited — wait a moment and retry');
  });

  it('handles non-ok response json parse error', async () => {
    mockGetStatus.mockReturnValue('missing');
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('parse error')),
    } as unknown as Response);

    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: makeWrapper() });
    const tmdbMap = new Map<number, LookupMovieData>([[1, makeTmdb()]]);

    await act(async () => {
      await result.current.run([makeMovie(1)], tmdbMap);
    });

    expect(result.current.state.failed).toBe(1);
  });
});
