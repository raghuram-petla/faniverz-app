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

import {
  useAddMovieProductionHouse,
  useRemoveMovieProductionHouse,
} from '@/hooks/useMovieProductionHouses';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

describe('useMovieProductionHouses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  describe('useAddMovieProductionHouse', () => {
    it('calls crudFetch POST with junction row data', async () => {
      mockCrudFetch.mockResolvedValue({});

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAddMovieProductionHouse(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          movieId: 'movie-1',
          productionHouseId: 'ph-1',
        });
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('POST', {
        table: 'movie_production_houses',
        data: { movie_id: 'movie-1', production_house_id: 'ph-1' },
      });
    });

    it('returns movieId and productionHouseId on success', async () => {
      mockCrudFetch.mockResolvedValue({});

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAddMovieProductionHouse(), { wrapper: Wrapper });

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.mutateAsync({
          movieId: 'movie-1',
          productionHouseId: 'ph-1',
        });
      });

      expect(returnValue).toEqual({ movieId: 'movie-1', productionHouseId: 'ph-1' });
    });

    it('invalidates correct cache keys on success', async () => {
      mockCrudFetch.mockResolvedValue({});

      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useAddMovieProductionHouse(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          movieId: 'movie-1',
          productionHouseId: 'ph-1',
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['admin', 'movie-production-houses', 'movie-1'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'movies'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'ott'] });
    });

    it('shows alert when Error is thrown', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Duplicate key'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAddMovieProductionHouse(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ movieId: 'movie-1', productionHouseId: 'ph-1' });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Duplicate key');
    });

    it('shows fallback message when non-Error is thrown', async () => {
      mockCrudFetch.mockRejectedValue('unexpected failure');

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAddMovieProductionHouse(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ movieId: 'movie-1', productionHouseId: 'ph-1' });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Operation failed');
    });
  });

  describe('useRemoveMovieProductionHouse', () => {
    it('calls crudFetch DELETE with composite key filters', async () => {
      mockCrudFetch.mockResolvedValue({});

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRemoveMovieProductionHouse(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          movieId: 'movie-2',
          productionHouseId: 'ph-2',
        });
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('DELETE', {
        table: 'movie_production_houses',
        filters: { movie_id: 'movie-2', production_house_id: 'ph-2' },
      });
    });

    it('returns movieId and productionHouseId on success', async () => {
      mockCrudFetch.mockResolvedValue({});

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRemoveMovieProductionHouse(), { wrapper: Wrapper });

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.mutateAsync({
          movieId: 'movie-2',
          productionHouseId: 'ph-2',
        });
      });

      expect(returnValue).toEqual({ movieId: 'movie-2', productionHouseId: 'ph-2' });
    });

    it('invalidates correct cache keys on success', async () => {
      mockCrudFetch.mockResolvedValue({});

      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveMovieProductionHouse(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          movieId: 'movie-2',
          productionHouseId: 'ph-2',
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['admin', 'movie-production-houses', 'movie-2'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'movies'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'ott'] });
    });

    it('shows alert when Error is thrown', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Delete failed'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRemoveMovieProductionHouse(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ movieId: 'movie-2', productionHouseId: 'ph-2' });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Delete failed');
    });

    it('shows fallback message when non-Error is thrown', async () => {
      mockCrudFetch.mockRejectedValue({ code: 500 });

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRemoveMovieProductionHouse(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ movieId: 'movie-2', productionHouseId: 'ph-2' });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Operation failed');
    });
  });
});
