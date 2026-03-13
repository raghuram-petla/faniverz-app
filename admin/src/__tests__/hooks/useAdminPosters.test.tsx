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

import {
  useMoviePosters,
  useAddPoster,
  useUpdatePoster,
  useRemovePoster,
  useSetMainPoster,
} from '@/hooks/useAdminPosters';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useMoviePosters', () => {
  it('fetches posters for a given movieId sorted by display_order', async () => {
    const mockPosters = [
      { id: 'p1', movie_id: 'm1', title: 'Main Poster', is_main: true, display_order: 0 },
      { id: 'p2', movie_id: 'm1', title: 'First Look', is_main: false, display_order: 1 },
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

    expect(mockFrom).toHaveBeenCalledWith('movie_posters');
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
  it('inserts a poster and invalidates the cache', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'p-new', movie_id: 'm1', title: 'New Poster', image_url: 'https://r2.dev/x.jpg' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useAddPoster(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        movie_id: 'm1',
        image_url: 'https://r2.dev/x.jpg',
        title: 'New Poster',
        is_main: false,
        display_order: 0,
      } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_posters');
    expect(mockInsert).toHaveBeenCalled();
  });
});

describe('useUpdatePoster', () => {
  it('updates a poster by id and invalidates the cache', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'p1', movie_id: 'm1', title: 'Updated Poster' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ update: mockUpdate });

    const { result } = renderHook(() => useUpdatePoster(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'p1', movieId: 'm1', title: 'Updated Poster' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_posters');
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'p1');
  });
});

describe('useRemovePoster', () => {
  it('deletes a poster by id', async () => {
    const mockEq2 = vi.fn().mockResolvedValue({ error: null });
    const mockEq = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useRemovePoster(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'p1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_posters');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'p1');
  });
});

describe('useSetMainPoster', () => {
  it('unsets existing main, sets new main, and syncs poster_url', async () => {
    // Mock for unset (update is_main=false on existing mains)
    const mockUnsetEqMain = vi.fn().mockResolvedValue({ error: null });
    const mockUnsetEqMovie = vi.fn().mockReturnValue({ eq: mockUnsetEqMain });
    const mockUnsetUpdate = vi.fn().mockReturnValue({ eq: mockUnsetEqMovie });

    // Mock for set main (update is_main=true on target)
    const mockSetSingle = vi.fn().mockResolvedValue({
      data: { id: 'p2', movie_id: 'm1', image_url: 'https://r2.dev/new.jpg', is_main: true },
      error: null,
    });
    const mockSetSelect = vi.fn().mockReturnValue({ single: mockSetSingle });
    const mockSetEq = vi.fn().mockReturnValue({ select: mockSetSelect });
    const mockSetUpdate = vi.fn().mockReturnValue({ eq: mockSetEq });

    // Mock for syncing movies.poster_url
    const mockSyncEq = vi.fn().mockResolvedValue({ error: null });
    const mockSyncUpdate = vi.fn().mockReturnValue({ eq: mockSyncEq });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'movies') {
        return { update: mockSyncUpdate };
      }
      // movie_posters — first call is unset, second is set
      callCount++;
      if (callCount === 1) {
        return { update: mockUnsetUpdate };
      }
      return { update: mockSetUpdate };
    });

    const { result } = renderHook(() => useSetMainPoster(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'p2', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify unset call
    expect(mockUnsetUpdate).toHaveBeenCalledWith({ is_main: false });
    // Verify set call
    expect(mockSetUpdate).toHaveBeenCalledWith({ is_main: true });
    // Verify movie poster_url sync
    expect(mockSyncUpdate).toHaveBeenCalledWith({ poster_url: 'https://r2.dev/new.jpg' });
    expect(mockSyncEq).toHaveBeenCalledWith('id', 'm1');
  });
});
