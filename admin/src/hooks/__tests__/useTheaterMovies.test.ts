import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockSupabaseFrom = vi.fn();
const mockCrudFetch = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

vi.mock('@/lib/admin-crud-client', () => ({
  crudFetch: (...args: unknown[]) => mockCrudFetch(...args),
}));

import {
  useTheaterMovies,
  useUpcomingMovies,
  useUpcomingRereleases,
  useTheaterSearch,
  useRemoveFromTheaters,
  useAddToTheaters,
} from '@/hooks/useTheaterMovies';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

/** Build a fluent Supabase chain that resolves at a terminal method */
function buildChain(resolveData: unknown, resolveError: unknown = null) {
  const terminal = Promise.resolve({ data: resolveData, error: resolveError });
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'gt', 'lte', 'ilike', 'is', 'limit'];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  // Make the chain itself a promise
  (chain as Record<string, unknown>)[Symbol.toStringTag] = 'Promise';
  // Attach .then so it can be awaited or returned
  (chain as Record<string, unknown>).then = (terminal as Promise<unknown>).then.bind(terminal);
  return chain;
}

describe('useTheaterMovies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches movies with in_theaters=true', async () => {
    const movies = [{ id: '1', title: 'Movie A', in_theaters: true }];
    const chain = buildChain(movies);
    mockSupabaseFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useTheaterMovies(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(movies);
    expect(chain.eq).toHaveBeenCalledWith('in_theaters', true);
  });

  it('throws when Supabase returns an error', async () => {
    const chain = buildChain(null, { message: 'DB error' });
    mockSupabaseFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useTheaterMovies(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ message: 'DB error' });
  });
});

describe('useUpcomingMovies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches movies with in_theaters=false and future release dates', async () => {
    const movies = [{ id: '2', title: 'Upcoming', in_theaters: false }];
    const chain = buildChain(movies);
    mockSupabaseFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpcomingMovies(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(movies);
    expect(chain.eq).toHaveBeenCalledWith('in_theaters', false);
    expect(chain.gt).toHaveBeenCalled();
    expect(chain.lte).toHaveBeenCalled();
  });

  it('throws when Supabase returns an error', async () => {
    const chain = buildChain(null, { message: 'Upcoming error' });
    mockSupabaseFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpcomingMovies(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpcomingRereleases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches theatrical runs with future dates', async () => {
    const runs = [{ id: 'r1', release_date: '2026-04-01', movies: { id: '1', title: 'A' } }];
    const chain = buildChain(runs);
    mockSupabaseFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpcomingRereleases(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(runs);
    expect(chain.gt).toHaveBeenCalled();
    expect(chain.lte).toHaveBeenCalled();
  });

  it('throws when Supabase returns an error', async () => {
    const chain = buildChain(null, { message: 'Rerelease error' });
    mockSupabaseFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpcomingRereleases(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useTheaterSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when search is less than 2 characters', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useTheaterSearch('a'), { wrapper: Wrapper });
    // Query is disabled — fetchStatus should be 'idle'
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches when search has 2+ characters', async () => {
    const movies = [{ id: '3', title: 'Baahubali' }];
    const chain = buildChain(movies);
    mockSupabaseFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useTheaterSearch('Ba'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(movies);
    expect(chain.ilike).toHaveBeenCalledWith('title', '%Ba%');
  });

  it('throws when Supabase returns an error', async () => {
    const chain = buildChain(null, { message: 'Search error' });
    mockSupabaseFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useTheaterSearch('Ba'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useRemoveFromTheaters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildUpdateChain(error: unknown = null) {
    // supabase chain: .from(...).update({...}).eq(...).is(...).then(...)
    // The `.then` is on the final promise-like returned by .is()
    const terminalPromise = Promise.resolve({ error });
    const isResult = {
      then: terminalPromise.then.bind(terminalPromise),
    };
    const eqFn = vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue(isResult) });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    return { update: updateFn };
  }

  it('calls crudFetch PATCH and supabase update in parallel', async () => {
    mockCrudFetch.mockResolvedValue({});
    const updateChain = buildUpdateChain();
    mockSupabaseFrom.mockReturnValue(updateChain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveFromTheaters(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ movieId: 'movie-1', endDate: '2026-03-22' });
    });

    expect(mockCrudFetch).toHaveBeenCalledWith(
      'PATCH',
      expect.objectContaining({
        table: 'movies',
        id: 'movie-1',
        data: { in_theaters: false },
      }),
    );
    expect(updateChain.update).toHaveBeenCalledWith({ end_date: '2026-03-22' });
  });

  it('invalidates query keys on success', async () => {
    mockCrudFetch.mockResolvedValue({});
    const updateChain = buildUpdateChain();
    mockSupabaseFrom.mockReturnValue(updateChain);

    const { qc, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useRemoveFromTheaters(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ movieId: 'movie-1', endDate: '2026-03-22' });
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('throws when supabase update returns error', async () => {
    mockCrudFetch.mockResolvedValue({});
    const updateChain = buildUpdateChain({ message: 'Update failed' });
    mockSupabaseFrom.mockReturnValue(updateChain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveFromTheaters(), { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ movieId: 'movie-1', endDate: '2026-03-22' }),
      ).rejects.toBeDefined();
    });
  });
});

describe('useAddToTheaters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls crudFetch PATCH and POST in parallel', async () => {
    mockCrudFetch.mockResolvedValue({});

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddToTheaters(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        movieId: 'movie-1',
        startDate: '2026-03-22',
        label: 'Theatrical',
      });
    });

    expect(mockCrudFetch).toHaveBeenCalledWith(
      'PATCH',
      expect.objectContaining({
        table: 'movies',
        id: 'movie-1',
        data: expect.objectContaining({ in_theaters: true }),
      }),
    );
    expect(mockCrudFetch).toHaveBeenCalledWith(
      'POST',
      expect.objectContaining({
        table: 'movie_theatrical_runs',
      }),
    );
  });

  it('includes premiereDate in patch when provided', async () => {
    mockCrudFetch.mockResolvedValue({});

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddToTheaters(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        movieId: 'movie-1',
        startDate: '2026-03-22',
        label: null,
        premiereDate: '2026-03-20',
      });
    });

    expect(mockCrudFetch).toHaveBeenCalledWith(
      'PATCH',
      expect.objectContaining({
        data: expect.objectContaining({ premiere_date: '2026-03-20' }),
      }),
    );
  });

  it('includes newReleaseDate in patch when provided', async () => {
    mockCrudFetch.mockResolvedValue({});

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddToTheaters(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        movieId: 'movie-1',
        startDate: '2026-03-22',
        label: null,
        newReleaseDate: '2026-04-01',
      });
    });

    expect(mockCrudFetch).toHaveBeenCalledWith(
      'PATCH',
      expect.objectContaining({
        data: expect.objectContaining({ release_date: '2026-04-01' }),
      }),
    );
  });

  it('does NOT include premiere_date or release_date when not provided', async () => {
    mockCrudFetch.mockResolvedValue({});

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddToTheaters(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        movieId: 'movie-1',
        startDate: '2026-03-22',
        label: null,
      });
    });

    const patchCall = mockCrudFetch.mock.calls.find((c) => c[0] === 'PATCH');
    expect(patchCall![1].data).not.toHaveProperty('premiere_date');
    expect(patchCall![1].data).not.toHaveProperty('release_date');
  });

  it('invalidates query keys on success', async () => {
    mockCrudFetch.mockResolvedValue({});

    const { qc, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useAddToTheaters(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        movieId: 'movie-2',
        startDate: '2026-03-22',
        label: null,
      });
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });
});
