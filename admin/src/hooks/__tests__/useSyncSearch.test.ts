import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useMovieSearch, useActorSearch } from '@/hooks/useSyncSearch';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

describe('useMovieSearch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not fire query when query is too short', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieSearch('a'), { wrapper: Wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('searches movies when query is >= 2 chars', async () => {
    const movies = [
      {
        id: '1',
        title: 'Test Movie',
        release_date: '2025-01-01',
        tmdb_id: 100,
        tmdb_last_synced_at: null,
        poster_url: null,
      },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: movies, error: null }),
          }),
        }),
      }),
    });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieSearch('te'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(movies);
    expect(mockFrom).toHaveBeenCalledWith('movies');
  });

  it('throws on supabase error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
          }),
        }),
      }),
    });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieSearch('te'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useActorSearch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not fire query when query is too short', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useActorSearch('x'), { wrapper: Wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('searches actors when query is >= 2 chars', async () => {
    const actors = [
      {
        id: '1',
        name: 'Jane',
        tmdb_person_id: 10,
        photo_url: null,
        biography: null,
        birth_date: null,
      },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: actors, error: null }),
          }),
        }),
      }),
    });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useActorSearch('ja'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(actors);
    expect(mockFrom).toHaveBeenCalledWith('actors');
  });

  it('throws on supabase error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
          }),
        }),
      }),
    });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useActorSearch('ja'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
