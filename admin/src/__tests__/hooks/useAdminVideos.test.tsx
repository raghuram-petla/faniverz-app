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
  useMovieVideos,
  useAddVideo,
  useUpdateVideo,
  useRemoveVideo,
} from '@/hooks/useAdminVideos';

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

describe('useMovieVideos', () => {
  it('fetches videos for a given movieId sorted by display_order', async () => {
    const mockVideos = [
      { id: 'v1', movie_id: 'm1', title: 'Trailer', display_order: 0 },
      { id: 'v2', movie_id: 'm1', title: 'Teaser', display_order: 1 },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: mockVideos, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMovieVideos('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_videos');
    expect(mockEq).toHaveBeenCalledWith('movie_id', 'm1');
    expect(mockOrder).toHaveBeenCalledWith('display_order', { ascending: true });
    expect(result.current.data).toEqual(mockVideos);
  });

  it('is disabled when movieId is empty', () => {
    const { result } = renderHook(() => useMovieVideos(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useAddVideo', () => {
  it('inserts a video via /api/admin-crud and invalidates the cache', async () => {
    const fetchSpy = mockCrudApi({ id: 'v-new', movie_id: 'm1', title: 'New Trailer' });

    const { result } = renderHook(() => useAddVideo(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        movie_id: 'm1',
        youtube_id: 'abc123',
        title: 'New Trailer',
        video_type: 'trailer',
        display_order: 0,
      } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          table: 'movie_videos',
          data: {
            movie_id: 'm1',
            youtube_id: 'abc123',
            title: 'New Trailer',
            video_type: 'trailer',
            display_order: 0,
          },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

describe('useUpdateVideo', () => {
  it('updates a video via /api/admin-crud by id and invalidates the cache', async () => {
    const fetchSpy = mockCrudApi({ id: 'v1', movie_id: 'm1', title: 'Updated Title' });

    const { result } = renderHook(() => useUpdateVideo(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'v1', movieId: 'm1', title: 'Updated Title' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_videos',
          id: 'v1',
          data: { title: 'Updated Title' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

describe('useRemoveVideo', () => {
  it('deletes a video via /api/admin-crud by id', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useRemoveVideo(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'v1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ table: 'movie_videos', id: 'v1' }),
      }),
    );

    fetchSpy.mockRestore();
  });
});
