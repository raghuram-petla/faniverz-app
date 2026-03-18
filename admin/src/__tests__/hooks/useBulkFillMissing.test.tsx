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
import type { ExistingMovieData } from '@/hooks/useSync';

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
  synopsis: null, // missing
  poster_url: null, // missing
  backdrop_url: null,
  trailer_url: null,
  director: null,
  runtime: null,
  genres: null,
  ...overrides,
});

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

  it('does nothing when no movies have gaps', async () => {
    const fullMovie = makeMovie('1', {
      synopsis: 'A story',
      poster_url: '/p.jpg',
      backdrop_url: '/b.jpg',
      trailer_url: 'yt',
      director: 'Director',
      runtime: 120,
      genres: ['Action'],
    });
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run([fullMovie]);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.state.total).toBe(0);
  });

  it('processes gapped movies sequentially', async () => {
    mockFetchOk();
    mockFetchOk();

    const movies = [makeMovie('1'), makeMovie('2')];
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies);
    });

    await waitFor(() => expect(result.current.state.isRunning).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.state.done).toBe(2);
    expect(result.current.state.failed).toBe(0);
  });

  it('counts failures but continues on non-429 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    mockFetchOk();

    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run([makeMovie('1'), makeMovie('2')]);
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
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run(movies);
    });

    await waitFor(() => expect(result.current.state.isRunning).toBe(false));
    // Only 1 fetch — stopped after 429
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.error).toContain('Rate limited');
  });

  it('sends only missing fields per movie', async () => {
    mockFetchOk();

    const movie = makeMovie('101', {
      title: 'Has Title', // not missing
      synopsis: null, // missing
      poster_url: null, // missing
      backdrop_url: '/b.jpg', // not missing
      trailer_url: 'yt', // not missing
      director: 'Dir', // not missing
      runtime: 120, // not missing
      genres: ['Action'], // not missing
    });

    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run([movie]);
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.tmdbId).toBe(101);
    expect(body.fields).toEqual(expect.arrayContaining(['synopsis', 'poster_url']));
    expect(body.fields).not.toContain('title');
    expect(body.fields).not.toContain('director');
  });

  it('reset() clears state to initial', async () => {
    mockFetchOk();
    const { result } = renderHook(() => useBulkFillMissing(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.run([makeMovie('1')]);
    });

    await waitFor(() => expect(result.current.state.done).toBe(1));

    act(() => result.current.reset());
    expect(result.current.state.done).toBe(0);
    expect(result.current.state.total).toBe(0);
  });
});
