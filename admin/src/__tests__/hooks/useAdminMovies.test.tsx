import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
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

    const cachedData = queryClient.getQueryData(['admin', 'movies', '', '', undefined]);
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

  it('applies search filter via ilike', async () => {
    const mockIlike = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ ilike: mockIlike });

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

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockIlike).toHaveBeenCalledWith('title', '%test%');
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

      mockFrom.mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return {
            select: vi.fn().mockResolvedValue({ data: platformIds, error: null }),
          };
        }
        const mockEq = vi.fn().mockResolvedValue({ data: movies, error: null });
        const mockLte = vi.fn().mockReturnValue({ eq: mockEq });
        const mockIn = vi.fn().mockReturnValue({ lte: mockLte });
        const mockRange = vi.fn().mockReturnValue({ in: mockIn });
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
    });
  });
});

describe('useCreateMovie', () => {
  it('calls supabase.from("movies").insert with the provided movie data', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'new-1', title: 'New Movie' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({
      insert: mockInsert,
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useCreateMovie(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ title: 'New Movie', release_date: '2025-06-01' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movies');
    expect(mockInsert).toHaveBeenCalledWith({
      title: 'New Movie',
      release_date: '2025-06-01',
    });
  });
});

describe('useDeleteMovie', () => {
  it('calls supabase.from("movies").delete().eq("id", movieId)', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      delete: mockDelete,
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useDeleteMovie(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('movie-to-delete');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movies');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'movie-to-delete');
  });
});
