import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getSession: () => mockGetSession() },
  },
}));

import {
  useMoviePosters,
  useAddPoster,
  useUpdatePoster,
  useRemovePoster,
  useSetMainPoster,
  useSetMainBackdrop,
} from '@/hooks/useAdminPosters';

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

describe('useMoviePosters', () => {
  it('fetches posters for a given movieId sorted by display_order', async () => {
    const mockPosters = [
      { id: 'p1', movie_id: 'm1', title: 'Main Poster', is_main_poster: true, display_order: 0 },
      { id: 'p2', movie_id: 'm1', title: 'First Look', is_main_poster: false, display_order: 1 },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: mockPosters, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMoviePosters('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_images');
    expect(mockEq).toHaveBeenCalledWith('movie_id', 'm1');
    expect(mockOrder).toHaveBeenCalledWith('display_order', { ascending: true });
    expect(result.current.data).toEqual(mockPosters);
  });

  it('is disabled when movieId is empty', () => {
    const { result } = renderHook(() => useMoviePosters(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useAddPoster', () => {
  it('inserts a poster via /api/admin-crud and invalidates the cache', async () => {
    const fetchSpy = mockCrudApi({
      id: 'p-new',
      movie_id: 'm1',
      title: 'New Poster',
      image_url: 'https://r2.dev/x.jpg',
    });

    const { result } = renderHook(() => useAddPoster(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        movie_id: 'm1',
        image_url: 'https://r2.dev/x.jpg',
        title: 'New Poster',
        is_main_poster: false,
        is_main_backdrop: false,
        image_type: 'poster',
        display_order: 0,
      } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          table: 'movie_images',
          data: {
            movie_id: 'm1',
            image_url: 'https://r2.dev/x.jpg',
            title: 'New Poster',
            is_main_poster: false,
            is_main_backdrop: false,
            image_type: 'poster',
            display_order: 0,
          },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

describe('useUpdatePoster', () => {
  it('updates a poster via /api/admin-crud by id and invalidates the cache', async () => {
    const fetchSpy = mockCrudApi({
      id: 'p1',
      movie_id: 'm1',
      title: 'Updated Poster',
    });

    const { result } = renderHook(() => useUpdatePoster(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'p1', movieId: 'm1', title: 'Updated Poster' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_images',
          id: 'p1',
          data: { title: 'Updated Poster' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

describe('useRemovePoster', () => {
  it('deletes a poster via /api/admin-crud by id', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useRemovePoster(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'p1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ table: 'movie_images', id: 'p1' }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

describe('useSetMainPoster', () => {
  it('unsets existing main, sets new main, and syncs poster_url', async () => {
    let callCount = 0;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // Unset old main poster
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      }
      if (callCount === 2) {
        // Set new main poster — returns poster with image_url
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'p2',
            movie_id: 'm1',
            image_url: 'https://r2.dev/new.jpg',
            is_main_poster: true,
          }),
        } as Response;
      }
      // Sync movies.poster_url
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    });

    const { result } = renderHook(() => useSetMainPoster(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'p2', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify 3 calls were made
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // Verify unset call (1st)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_images',
          filters: { movie_id: 'm1', is_main_poster: true },
          data: { is_main_poster: false },
          returnOne: false,
        }),
      }),
    );

    // Verify set main call (2nd)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_images',
          id: 'p2',
          data: { is_main_poster: true },
        }),
      }),
    );

    // Verify poster_url sync call (3rd)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movies',
          id: 'm1',
          data: { poster_url: 'https://r2.dev/new.jpg' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });

  it('shows alert with "Failed to set main poster" on error', async () => {
    const fetchSpy = mockCrudApi(null, 500);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useSetMainPoster(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'p1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});

// @contract useSetMainBackdrop — mirrors useSetMainPoster but for backdrop_url
describe('useSetMainBackdrop', () => {
  it('unsets existing main backdrop, sets new main, and syncs backdrop_url', async () => {
    let callCount = 0;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // Unset old main backdrop
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      }
      if (callCount === 2) {
        // Set new main backdrop — returns image with image_url
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'b2',
            movie_id: 'm1',
            image_url: 'https://r2.dev/backdrop.jpg',
            image_type: 'backdrop',
            is_main_backdrop: true,
          }),
        } as Response;
      }
      // Sync movies.backdrop_url
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    });

    const { result } = renderHook(() => useSetMainBackdrop(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'b2', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // Verify unset call (1st)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_images',
          filters: { movie_id: 'm1', is_main_backdrop: true },
          data: { is_main_backdrop: false },
          returnOne: false,
        }),
      }),
    );

    // Verify set main backdrop call (2nd)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_images',
          id: 'b2',
          data: { is_main_backdrop: true },
        }),
      }),
    );

    // Verify backdrop_url sync call (3rd) — includes backdrop_image_type from image record
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movies',
          id: 'm1',
          data: { backdrop_url: 'https://r2.dev/backdrop.jpg', backdrop_image_type: 'backdrop' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });

  it('shows alert with "Failed to set main backdrop" on error', async () => {
    const fetchSpy = mockCrudApi(null, 500);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useSetMainBackdrop(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'b1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
