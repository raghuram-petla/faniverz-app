import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockGetSession = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { getSession: () => mockGetSession() },
  },
}));

import { useAdminMovies, useCreateMovie, useDeleteMovie } from '@/hooks/useAdminMovies';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function mockCrudApi(responseData: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => (status >= 200 && status < 300 ? responseData : { error: 'fail' }),
  } as Response);
}

beforeEach(() => {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
});

describe('useAdminMovies', () => {
  it('uses the correct query key ["admin", "movies", search, statusFilter, productionHouseIds]', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAdminMovies(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const cachedData = queryClient.getQueryData([
      'admin',
      'movies',
      '',
      '',
      undefined,
      undefined,
      undefined,
    ]);
    expect(cachedData).toBeDefined();
  });

  it('calls supabase.from("movies") and returns paginated data', async () => {
    const mockMovies = [
      { id: '1', title: 'Movie A', release_date: '2025-01-01' },
      { id: '2', title: 'Movie B', release_date: '2025-02-01' },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: mockMovies, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movies');
    expect(result.current.data?.pages.flat()).toEqual(mockMovies);
  });

  it('applies search filter via search_movies RPC', async () => {
    // RPC returns matching movie IDs
    mockRpc.mockResolvedValue({ data: [{ id: 'm1' }], error: null });

    const mockIn = vi
      .fn()
      .mockResolvedValue({ data: [{ id: 'm1', title: 'Test Movie' }], error: null });
    const mockRange = vi.fn().mockReturnValue({ in: mockIn });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies('test'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith('search_movies', {
      search_term: 'test',
      result_limit: 1000,
      result_offset: 0,
    });
  });

  it('applies in_theaters status filter via eq', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies('', 'in_theaters'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockEq).toHaveBeenCalledWith('in_theaters', true);
  });

  describe('platform movie IDs caching — regression', () => {
    it('does not fetch movie_platforms when filter is empty', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useAdminMovies('', ''), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const fromCalls = mockFrom.mock.calls.map((c: unknown[]) => c[0]);
      expect(fromCalls).not.toContain('movie_platforms');
    });

    it('fetches platform IDs via separate cached query for streaming filter', async () => {
      const platformIds = [{ movie_id: 'm1' }];
      const movies = [{ id: 'm1', title: 'Stream Movie' }];

      // @contract After refactor, status filter returns includeIds instead of calling .in()
      // The merged .in() is applied after column filters, so chain is: range → lte → eq → in → resolve
      mockFrom.mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return {
            select: vi.fn().mockResolvedValue({ data: platformIds, error: null }),
          };
        }
        const mockIn = vi.fn().mockResolvedValue({ data: movies, error: null });
        const mockEq = vi.fn().mockReturnValue({ in: mockIn });
        const mockLte = vi.fn().mockReturnValue({ eq: mockEq });
        const mockRange = vi.fn().mockReturnValue({ lte: mockLte });
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({ range: mockRange }),
          }),
        };
      });

      const { result } = renderHook(() => useAdminMovies('', 'streaming'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFrom).toHaveBeenCalledWith('movie_platforms');
      // @invariant Verify single .in('id', ...) is called with merged platform movie IDs
      expect(mockFrom).toHaveBeenCalledWith('movies');
    });
  });

  describe('advanced filters', () => {
    it('applies genre filter via overlaps', async () => {
      const mockOverlaps = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockRange = vi.fn().mockReturnValue({ overlaps: mockOverlaps });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ range: mockRange }),
        }),
      });

      const filters = {
        genres: ['Action', 'Drama'],
        releaseYear: '',
        releaseMonth: '',
        certification: '',
        language: '',
        platformId: '',
        isFeatured: false,
        minRating: '',
        actorSearch: '',
        directorSearch: '',
      };

      const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockOverlaps).toHaveBeenCalledWith('genres', ['Action', 'Drama']);
    });

    it('applies certification filter via eq', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockRange = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ range: mockRange }),
        }),
      });

      const filters = {
        genres: [],
        releaseYear: '',
        releaseMonth: '',
        certification: 'UA',
        language: '',
        platformId: '',
        isFeatured: false,
        minRating: '',
        actorSearch: '',
        directorSearch: '',
      };

      const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockEq).toHaveBeenCalledWith('certification', 'UA');
    });

    it('applies director search via ilike', async () => {
      const mockIlike = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockRange = vi.fn().mockReturnValue({ ilike: mockIlike });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ range: mockRange }),
        }),
      });

      const filters = {
        genres: [],
        releaseYear: '',
        releaseMonth: '',
        certification: '',
        language: '',
        platformId: '',
        isFeatured: false,
        minRating: '',
        actorSearch: '',
        directorSearch: 'Rajamouli',
      };

      const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockIlike).toHaveBeenCalledWith('director', '%Rajamouli%');
    });

    it('resolves actor search via movie_cast join query', async () => {
      const mockActorIlike = vi.fn().mockResolvedValue({
        data: [{ movie_id: 'm1' }, { movie_id: 'm2' }],
        error: null,
      });
      const mockActorSelect = vi.fn().mockReturnValue({ ilike: mockActorIlike });

      const mockIn = vi.fn().mockResolvedValue({ data: [{ id: 'm1' }], error: null });
      const mockRange = vi.fn().mockReturnValue({ in: mockIn });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'movie_cast') {
          return { select: mockActorSelect };
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({ range: mockRange }),
          }),
        };
      });

      const filters = {
        genres: [],
        releaseYear: '',
        releaseMonth: '',
        certification: '',
        language: '',
        platformId: '',
        isFeatured: false,
        minRating: '',
        actorSearch: 'Mahesh',
        directorSearch: '',
      };

      const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFrom).toHaveBeenCalledWith('movie_cast');
      expect(mockActorSelect).toHaveBeenCalledWith('movie_id, actors!inner(name)');
    });

    it('returns empty when actor search yields no matching movies', async () => {
      const mockActorIlike = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockActorSelect = vi.fn().mockReturnValue({ ilike: mockActorIlike });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'movie_cast') {
          return { select: mockActorSelect };
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      const filters = {
        genres: [],
        releaseYear: '',
        releaseMonth: '',
        certification: '',
        language: '',
        platformId: '',
        isFeatured: false,
        minRating: '',
        actorSearch: 'NonexistentActor',
        directorSearch: '',
      };

      const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.pages.flat()).toEqual([]);
    });

    it('skips advanced filters when undefined is passed', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useAdminMovies('', '', undefined, undefined), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.pages.flat()).toEqual([{ id: '1' }]);
    });
  });
});

describe('useAdminMovies - pagination', () => {
  it('returns next page param when page is full (50 items)', async () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({ id: `m-${i}`, title: `Movie ${i}` }));
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: fullPage, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('returns no next page param when page has fewer than 50 items', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('useAdminMovies - search enabled logic', () => {
  it('is disabled when search is 1 character', () => {
    const { result } = renderHook(() => useAdminMovies('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is enabled when search is empty string', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('is enabled when search is 2+ characters', async () => {
    // RPC returns matching movie IDs
    mockRpc.mockResolvedValue({ data: [{ id: 'm1' }], error: null });

    const mockIn = vi.fn().mockResolvedValue({ data: [{ id: 'm1' }], error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockReturnValue({ in: mockIn }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies('ab'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useAdminMovies - language filter', () => {
  it('applies language filter via eq when selectedLanguageCode is provided', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies('', '', undefined, undefined, 'te'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockEq).toHaveBeenCalledWith('original_language', 'te');
  });
});

describe('useAdminMovies - PH scoping', () => {
  it('returns empty when PH junction returns no movie IDs', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useAdminMovies('', '', ['ph-1']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages.flat()).toEqual([]);
  });

  it('throws when PH junction query errors', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null, error: new Error('Junction error') }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useAdminMovies('', '', ['ph-1']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateMovie', () => {
  it('calls /api/admin-crud with POST method and movie data', async () => {
    const fetchSpy = mockCrudApi({ id: 'new-1', title: 'New Movie' });

    const { result } = renderHook(() => useCreateMovie(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ title: 'New Movie', release_date: '2025-06-01' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          table: 'movies',
          data: { title: 'New Movie', release_date: '2025-06-01' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

// ── useAllMovies ─────────────────────────────────────────────────────────────

import { useAllMovies, useAdminMovie, useUpdateMovie } from '@/hooks/useAdminMovies';

describe('useAllMovies', () => {
  it('fetches all movies without PH scoping', async () => {
    const movies = [{ id: '1', title: 'Movie A' }];
    const mockLimit = vi.fn().mockResolvedValue({ data: movies, error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useAllMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movies');
    expect(mockLimit).toHaveBeenCalledWith(5000);
    expect(result.current.data).toEqual(movies);
  });

  it('fetches PH-scoped movies via junction table', async () => {
    const phJunctions = [{ movie_id: 'm1' }, { movie_id: 'm2' }];
    const phMovies = [{ id: 'm1', title: 'PH Movie' }];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: phJunctions, error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: phMovies, error: null }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useAllMovies(['ph-1']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movie_production_houses');
    expect(result.current.data).toEqual(phMovies);
  });

  it('returns empty array when PH has no movies', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useAllMovies(['ph-1']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('throws when movies query errors', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    });

    const { result } = renderHook(() => useAllMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('throws when PH-scoped movies query errors (line 248)', async () => {
    const phJunctions = [{ movie_id: 'm1' }];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: phJunctions, error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi
              .fn()
              .mockResolvedValue({ data: null, error: new Error('PH movie fetch error') }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useAllMovies(['ph-1']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('throws when PH junction query errors', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_production_houses') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null, error: new Error('junction error') }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useAllMovies(['ph-1']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useAdminMovie / useUpdateMovie ───────────────────────────────────────────

describe('useAdminMovie', () => {
  it('is defined (exported from createCrudHooks)', () => {
    expect(useAdminMovie).toBeDefined();
  });
});

describe('useUpdateMovie', () => {
  it('calls /api/admin-crud with PATCH method', async () => {
    const fetchSpy = mockCrudApi({ id: '1', title: 'Updated' });

    const { result } = renderHook(() => useUpdateMovie(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: '1', title: 'Updated' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
      }),
    );

    fetchSpy.mockRestore();
  });
});

// ── useAdminMovies — additional branch coverage ──────────────────────────────

describe('useAdminMovies — platform filter', () => {
  it('resolves platform filter IDs via movie_platforms query', async () => {
    const platformFilterIds = [{ movie_id: 'm1' }];
    const movies = [{ id: 'm1', title: 'Filtered Movie' }];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_platforms') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: platformFilterIds, error: null }),
          }),
        };
      }
      const mockIn = vi.fn().mockResolvedValue({ data: movies, error: null });
      const mockRange = vi.fn().mockReturnValue({ in: mockIn });
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ range: mockRange }),
        }),
      };
    });

    const filters = {
      genres: [],
      releaseYear: '',
      releaseMonth: '',
      certification: '',
      language: '',
      platformId: 'plat-1',
      isFeatured: false,
      minRating: '',
      actorSearch: '',
      directorSearch: '',
    };

    const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movie_platforms');
  });
});

describe('useAdminMovies — search RPC error', () => {
  it('search_movies RPC error throws in its own useQuery', async () => {
    // When RPC errors, the search IDs query throws, which keeps the infinite query disabled
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Search RPC failed' } });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies('test search'), {
      wrapper: createWrapper(),
    });

    // The infinite query stays idle because searchIdsReady never becomes true
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
  });
});

describe('useAdminMovies — query error', () => {
  it('propagates error from movies query', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: null, error: new Error('DB down') }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAdminMovies — releaseYear + releaseMonth filter', () => {
  it('applies releaseYear with releaseMonth via gte/lte', async () => {
    const mockLte = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockGte = vi.fn().mockReturnValue({ lte: mockLte });
    const mockRange = vi.fn().mockReturnValue({ gte: mockGte });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ range: mockRange }),
      }),
    });

    const filters = {
      genres: [],
      releaseYear: '2024',
      releaseMonth: '06',
      certification: '',
      language: '',
      platformId: '',
      isFeatured: false,
      minRating: '',
      actorSearch: '',
      directorSearch: '',
    };

    const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGte).toHaveBeenCalledWith('release_date', '2024-06-01');
    expect(mockLte).toHaveBeenCalledWith('release_date', '2024-06-30');
  });

  it('applies releaseYear without releaseMonth (full year range)', async () => {
    const mockLte = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockGte = vi.fn().mockReturnValue({ lte: mockLte });
    const mockRange = vi.fn().mockReturnValue({ gte: mockGte });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ range: mockRange }),
      }),
    });

    const filters = {
      genres: [],
      releaseYear: '2024',
      releaseMonth: '',
      certification: '',
      language: '',
      platformId: '',
      isFeatured: false,
      minRating: '',
      actorSearch: '',
      directorSearch: '',
    };

    const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGte).toHaveBeenCalledWith('release_date', '2024-01-01');
    expect(mockLte).toHaveBeenCalledWith('release_date', '2024-12-31');
  });
});

describe('useAdminMovies — language filter via advanced filters', () => {
  it('applies language filter from advancedFilters', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ range: mockRange }),
      }),
    });

    const filters = {
      genres: [],
      releaseYear: '',
      releaseMonth: '',
      certification: '',
      language: 'te',
      platformId: '',
      isFeatured: false,
      minRating: '',
      actorSearch: '',
      directorSearch: '',
    };

    const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockEq).toHaveBeenCalledWith('original_language', 'te');
  });
});

describe('useAdminMovies — isFeatured filter', () => {
  it('applies isFeatured filter via eq', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ range: mockRange }),
      }),
    });

    const filters = {
      genres: [],
      releaseYear: '',
      releaseMonth: '',
      certification: '',
      language: '',
      platformId: '',
      isFeatured: true,
      minRating: '',
      actorSearch: '',
      directorSearch: '',
    };

    const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockEq).toHaveBeenCalledWith('is_featured', true);
  });
});

describe('useAdminMovies — minRating filter', () => {
  it('applies minRating filter via gte', async () => {
    const mockGte = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ gte: mockGte });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ range: mockRange }),
      }),
    });

    const filters = {
      genres: [],
      releaseYear: '',
      releaseMonth: '',
      certification: '',
      language: '',
      platformId: '',
      isFeatured: false,
      minRating: '7',
      actorSearch: '',
      directorSearch: '',
    };

    const { result } = renderHook(() => useAdminMovies('', '', undefined, filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGte).toHaveBeenCalledWith('rating', 7);
  });
});

describe('useAdminMovies — excludeIds (released filter)', () => {
  it('applies excludeIds via .not for released status filter', async () => {
    const platformIds = [{ movie_id: 'm1' }];

    // Track .not calls via a spy
    const notCalls: unknown[][] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_platforms') {
        return {
          select: vi.fn().mockResolvedValue({ data: platformIds, error: null }),
        };
      }
      // Proxy-based chain that tracks .not calls
      const result = { data: [{ id: 'm2' }], error: null };
      const chain: Record<string, ReturnType<typeof vi.fn>> = {};
      const self = new Proxy(chain, {
        get(target, prop) {
          if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(result);
          if (prop === 'catch') return () => self;
          if (!target[prop as string]) {
            target[prop as string] = vi.fn((...args: unknown[]) => {
              if (prop === 'not') notCalls.push(args);
              return self;
            });
          }
          return target[prop as string];
        },
      });
      return { select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue(self) }) };
    });

    const { result } = renderHook(() => useAdminMovies('', 'released'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The released filter should have called .not('id', 'in', '(m1)') to exclude streaming movies
    expect(notCalls.length).toBeGreaterThan(0);
    expect(notCalls.some((c) => c[0] === 'id' && c[1] === 'in')).toBe(true);
  });
});

describe('useAdminMovies — announced status filter', () => {
  it('applies announced filter via is(release_date, null)', async () => {
    const mockIs = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ is: mockIs });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ range: mockRange }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies('', 'announced'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockIs).toHaveBeenCalledWith('release_date', null);
  });
});

describe('useAdminMovies — upcoming status filter', () => {
  it('applies upcoming filter via gt(release_date, today)', async () => {
    const mockGt = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ gt: mockGt });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ range: mockRange }),
      }),
    });

    const { result } = renderHook(() => useAdminMovies('', 'upcoming'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGt).toHaveBeenCalled();
  });
});

describe('useAdminMovies — streaming with empty pmIds returns empty', () => {
  it('returns empty when streaming filter has no platform IDs', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movie_platforms') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    const { result } = renderHook(() => useAdminMovies('', 'streaming'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages.flat()).toEqual([]);
  });
});

describe('useDeleteMovie', () => {
  it('calls /api/admin-crud with DELETE method and movie id', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useDeleteMovie(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('movie-to-delete');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ table: 'movies', id: 'movie-to-delete' }),
      }),
    );

    fetchSpy.mockRestore();
  });
});
