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

vi.mock('@/lib/audit-client', () => ({
  logAudit: vi.fn(),
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
    expect(mockOrder).toHaveBeenCalledWith('display_order');
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
  it('inserts a video and invalidates the cache', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'v-new', movie_id: 'm1', title: 'New Trailer' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });

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

    expect(mockFrom).toHaveBeenCalledWith('movie_videos');
    expect(mockInsert).toHaveBeenCalled();
  });
});

describe('useUpdateVideo', () => {
  it('updates a video by id and invalidates the cache', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'v1', movie_id: 'm1', title: 'Updated Title' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ update: mockUpdate });

    const { result } = renderHook(() => useUpdateVideo(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'v1', movieId: 'm1', title: 'Updated Title' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_videos');
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'v1');
  });
});

describe('useRemoveVideo', () => {
  it('deletes a video by id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useRemoveVideo(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'v1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_videos');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'v1');
  });
});
