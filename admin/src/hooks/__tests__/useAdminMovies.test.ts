import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mocks must be defined before imports
vi.mock('@/hooks/createCrudHooks', () => ({
  createCrudHooks: vi.fn(() => ({
    useSingle: vi.fn(),
    useCreate: vi.fn(),
    useUpdate: vi.fn(),
    useDelete: vi.fn(),
  })),
}));

vi.mock('@/hooks/useAdminMoviesFilters', () => ({
  applyStatusFilter: vi.fn(() => ({
    query: { in: vi.fn().mockReturnThis() },
    empty: false,
    includeIds: null,
    excludeIds: [],
  })),
  applyColumnFilters: vi.fn((q: unknown) => q),
  intersectIdSets: vi.fn(() => null),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn() },
  },
}));

import { useAdminMovies, useAllMovies } from '@/hooks/useAdminMovies';
import {
  applyStatusFilter,
  applyColumnFilters,
  intersectIdSets,
} from '@/hooks/useAdminMoviesFilters';
import { supabase } from '@/lib/supabase-browser';

const mockFrom = vi.mocked(supabase.from);

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

function buildChain(resolveWith: { data: unknown; error: unknown } = { data: [], error: null }) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(resolveWith),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolveWith),
  };
  return chain;
}

// Build a thenable chain — needed because the hook does `await query` after all filter calls
function buildResolvingChain(
  resolveWith: { data: unknown; error: unknown } = { data: [], error: null },
) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolveWith),
  };
  // Make the chain itself a thenable so `await query` resolves
  chain.then = (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
    Promise.resolve(resolveWith).then(resolve, reject);
  return chain;
}

describe('useAdminMovies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // applyColumnFilters returns the query it receives (passthrough)
    vi.mocked(applyColumnFilters).mockImplementation((q: unknown) => q);
    vi.mocked(intersectIdSets).mockReturnValue(null);
  });

  it('queries movies table with default parameters', async () => {
    const movies = [{ id: 'm1', title: 'Movie 1', release_date: '2024-01-01' }];
    const chain = buildResolvingChain({ data: movies, error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);
    // applyStatusFilter passes the same chain through
    vi.mocked(applyStatusFilter).mockReturnValue({
      query: chain,
      empty: false,
      includeIds: null,
      excludeIds: [],
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminMovies(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFrom).toHaveBeenCalledWith('movies');
  });

  it('returns empty pages when query returns no data', async () => {
    const chain = buildResolvingChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);
    vi.mocked(applyStatusFilter).mockReturnValue({
      query: chain,
      empty: false,
      includeIds: null,
      excludeIds: [],
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminMovies(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0]).toEqual([]);
  });

  it('applies ilike search filter when search >= 2 chars', async () => {
    const chain = buildResolvingChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);
    vi.mocked(applyStatusFilter).mockReturnValue({
      query: chain,
      empty: false,
      includeIds: null,
      excludeIds: [],
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminMovies('te'), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(chain.ilike).toHaveBeenCalledWith('title', '%te%');
  });

  it('is disabled when search is exactly 1 character', () => {
    const chain = buildResolvingChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);
    vi.mocked(applyStatusFilter).mockReturnValue({
      query: chain,
      empty: false,
      includeIds: null,
      excludeIds: [],
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminMovies('t'), { wrapper: Wrapper });

    // Query should be disabled
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('applies language filter when selectedLanguageCode is provided', async () => {
    const chain = buildResolvingChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);
    vi.mocked(applyStatusFilter).mockReturnValue({
      query: chain,
      empty: false,
      includeIds: null,
      excludeIds: [],
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminMovies('', '', undefined, undefined, 'te'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(chain.eq).toHaveBeenCalledWith('original_language', 'te');
  });

  it('returns empty array when PH scope resolves to empty', async () => {
    // PH junction returns empty array
    const phChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(phChain as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminMovies('', '', ['ph-1']), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0]).toEqual([]);
  });

  it('throws error when query fails', async () => {
    const chain = buildResolvingChain({ data: null, error: new Error('DB error') });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);
    vi.mocked(applyStatusFilter).mockReturnValue({
      query: chain,
      empty: false,
      includeIds: null,
      excludeIds: [],
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminMovies(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('returns empty when applyStatusFilter returns empty=true', async () => {
    const chain = buildResolvingChain({ data: [{ id: 'm1' }], error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);
    vi.mocked(applyStatusFilter).mockReturnValue({
      query: chain,
      empty: true,
      includeIds: null,
      excludeIds: [],
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminMovies('', 'streaming'), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0]).toEqual([]);
  });

  it('has next page when page is full (50 items)', async () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({ id: String(i) }));
    const chain = buildResolvingChain({ data: fullPage, error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);
    vi.mocked(applyStatusFilter).mockReturnValue({
      query: chain,
      empty: false,
      includeIds: null,
      excludeIds: [],
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminMovies(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasNextPage).toBe(true);
  });

  it('has no next page when page is less than 50 items', async () => {
    const chain = buildResolvingChain({ data: [{ id: '1' }], error: null });
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);
    vi.mocked(applyStatusFilter).mockReturnValue({
      query: chain,
      empty: false,
      includeIds: null,
      excludeIds: [],
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminMovies(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('useAllMovies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(applyStatusFilter).mockReturnValue({
      query: buildChain({ data: [], error: null }),
      empty: false,
      includeIds: null,
      excludeIds: [],
    });
    vi.mocked(applyColumnFilters).mockImplementation((q: unknown) => q);
    vi.mocked(intersectIdSets).mockReturnValue(null);
  });

  it('fetches all movies without PH scope', async () => {
    const movies = [{ id: 'm1', title: 'Movie A' }];
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: movies, error: null }),
    };
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllMovies(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(movies);
    expect(chain.limit).toHaveBeenCalledWith(5000);
  });

  it('fetches movies scoped to PH IDs', async () => {
    const phMovieIds = [{ movie_id: 'm1' }, { movie_id: 'm2' }];
    const movies = [{ id: 'm1' }, { id: 'm2' }];
    const phChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: phMovieIds, error: null }),
    };
    const moviesResolve = { data: movies, error: null };
    const moviesChain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };
    moviesChain.in = vi.fn().mockImplementation(function (this: unknown) {
      return moviesChain;
    });
    moviesChain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve(moviesResolve).then(resolve, reject);

    mockFrom
      .mockReturnValueOnce(phChain as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(moviesChain as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllMovies(['ph-1']), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFrom).toHaveBeenCalledWith('movie_production_houses');
    expect(mockFrom).toHaveBeenCalledWith('movies');
  });

  it('returns empty array when PH scope has no movies', async () => {
    const phChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(phChain as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllMovies(['ph-empty']), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('throws error when PH junction query fails', async () => {
    const phChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: null, error: new Error('Junction error') }),
    };
    mockFrom.mockReturnValue(phChain as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllMovies(['ph-1']), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('throws error when movies query fails without PH scope', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error('Query error') }),
    };
    mockFrom.mockReturnValue(chain as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllMovies(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
