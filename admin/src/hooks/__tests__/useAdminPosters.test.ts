import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockCrudFetch = vi.fn();

vi.mock('@/lib/admin-crud-client', () => ({
  crudFetch: (...args: unknown[]) => mockCrudFetch(...args),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
      signOut: vi.fn(),
    },
  },
}));

import { useSetMainPoster, useSetMainBackdrop } from '@/hooks/useAdminPosters';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

describe('useAdminPosters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  describe('useSetMainPoster', () => {
    it('calls crudFetch three times in correct sequence', async () => {
      const posterData = {
        id: 'img-1',
        image_url: 'https://cdn.example.com/poster.jpg',
        image_type: 'poster',
      };
      // 1st call: unset old main poster → returns void/ignored
      // 2nd call: set new main poster → returns poster data
      // 3rd call: update movies.poster_url → returns void/ignored
      mockCrudFetch
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(posterData)
        .mockResolvedValueOnce(undefined);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useSetMainPoster(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 'img-1', movieId: 'movie-1' });
      });

      expect(mockCrudFetch).toHaveBeenCalledTimes(3);

      // First call: unset existing main posters
      expect(mockCrudFetch).toHaveBeenNthCalledWith(1, 'PATCH', {
        table: 'movie_images',
        filters: { movie_id: 'movie-1', is_main_poster: true },
        data: { is_main_poster: false },
        returnOne: false,
      });

      // Second call: set new main poster
      expect(mockCrudFetch).toHaveBeenNthCalledWith(2, 'PATCH', {
        table: 'movie_images',
        id: 'img-1',
        data: { is_main_poster: true },
      });

      // Third call: update movie's poster_url
      expect(mockCrudFetch).toHaveBeenNthCalledWith(3, 'PATCH', {
        table: 'movies',
        id: 'movie-1',
        data: { poster_url: posterData.image_url, poster_image_type: posterData.image_type },
      });
    });

    it('returns data with movieId appended', async () => {
      const posterData = {
        id: 'img-1',
        image_url: 'https://cdn.example.com/poster.jpg',
        image_type: 'poster',
      };
      mockCrudFetch
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(posterData)
        .mockResolvedValueOnce(undefined);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useSetMainPoster(), { wrapper: Wrapper });

      let mutationResult: unknown;
      await act(async () => {
        mutationResult = await result.current.mutateAsync({ id: 'img-1', movieId: 'movie-1' });
      });

      expect(mutationResult).toMatchObject({ ...posterData, movieId: 'movie-1' });
    });

    it('shows alert on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Upload failed'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useSetMainPoster(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'img-1', movieId: 'movie-1' });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Upload failed');
    });

    it('shows fallback alert message when error has no message', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useSetMainPoster(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'img-1', movieId: 'movie-1' });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Failed to set main poster');
    });
  });

  describe('useSetMainBackdrop', () => {
    it('calls crudFetch three times in correct sequence for backdrop', async () => {
      const backdropData = {
        id: 'img-2',
        image_url: 'https://cdn.example.com/backdrop.jpg',
        image_type: 'backdrop',
      };
      mockCrudFetch
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(backdropData)
        .mockResolvedValueOnce(undefined);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useSetMainBackdrop(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 'img-2', movieId: 'movie-2' });
      });

      expect(mockCrudFetch).toHaveBeenCalledTimes(3);

      expect(mockCrudFetch).toHaveBeenNthCalledWith(1, 'PATCH', {
        table: 'movie_images',
        filters: { movie_id: 'movie-2', is_main_backdrop: true },
        data: { is_main_backdrop: false },
        returnOne: false,
      });

      expect(mockCrudFetch).toHaveBeenNthCalledWith(2, 'PATCH', {
        table: 'movie_images',
        id: 'img-2',
        data: { is_main_backdrop: true },
      });

      expect(mockCrudFetch).toHaveBeenNthCalledWith(3, 'PATCH', {
        table: 'movies',
        id: 'movie-2',
        data: {
          backdrop_url: backdropData.image_url,
          backdrop_image_type: backdropData.image_type,
        },
      });
    });

    it('returns data with movieId appended', async () => {
      const backdropData = {
        id: 'img-2',
        image_url: 'https://cdn.example.com/backdrop.jpg',
        image_type: 'backdrop',
      };
      mockCrudFetch
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(backdropData)
        .mockResolvedValueOnce(undefined);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useSetMainBackdrop(), { wrapper: Wrapper });

      let mutationResult: unknown;
      await act(async () => {
        mutationResult = await result.current.mutateAsync({ id: 'img-2', movieId: 'movie-2' });
      });

      expect(mutationResult).toMatchObject({ ...backdropData, movieId: 'movie-2' });
    });

    it('shows alert on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Backdrop failed'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useSetMainBackdrop(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'img-2', movieId: 'movie-2' });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Backdrop failed');
    });

    it('shows fallback alert message when error has no message', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useSetMainBackdrop(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'img-2', movieId: 'movie-2' });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Failed to set main backdrop');
    });

    it('invalidates correct query keys on success', async () => {
      const backdropData = {
        id: 'img-2',
        image_url: 'https://cdn.example.com/backdrop.jpg',
        image_type: 'backdrop',
      };
      mockCrudFetch
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(backdropData)
        .mockResolvedValueOnce(undefined);

      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useSetMainBackdrop(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 'img-2', movieId: 'movie-2' });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'images', 'movie-2'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'movie', 'movie-2'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'movies'] });
    });
  });
});
