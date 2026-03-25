import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockCrudFetch = vi.fn();
const _mockFrom = vi.fn();

vi.mock('@/lib/admin-crud-client', () => ({
  crudFetch: (...args: unknown[]) => mockCrudFetch(...args),
}));

const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  },
}));

import {
  useMovieAvailability,
  useCountries,
  useAddMovieAvailability,
  useUpdateMovieAvailability,
  useRemoveMovieAvailability,
} from '@/hooks/useAdminMovieAvailability';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

const makeAvailabilityRow = (id: string, movieId: string) => ({
  id,
  movie_id: movieId,
  platform_id: 'netflix',
  country_code: 'IN',
  availability_type: 'flatrate' as const,
  available_from: null,
  streaming_url: null,
  platform: { id: 'netflix', name: 'Netflix' },
});

describe('useAdminMovieAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  describe('useMovieAvailability', () => {
    it('fetches availability rows for a movieId', async () => {
      const rows = [makeAvailabilityRow('avail-1', 'movie-1')];
      // The query calls .order() 3 times, so we need a thenable on the last one
      let callCount = 0;
      const orderFn = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount >= 3) {
          // 3rd order() — return a promise
          return Promise.resolve({ data: rows, error: null });
        }
        return fromResult; // return self for chaining
      });
      const fromResult = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: orderFn,
      };
      mockSupabaseFrom.mockReturnValue(fromResult);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useMovieAvailability('movie-1'), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(rows);
    });

    it('is disabled when movieId is empty', () => {
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useMovieAvailability(''), { wrapper: Wrapper });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('throws on supabase error', async () => {
      let callCount2 = 0;
      const orderFnErr = vi.fn().mockImplementation(() => {
        callCount2++;
        if (callCount2 >= 3) {
          return Promise.resolve({ data: null, error: new Error('DB error') });
        }
        return fromResult2;
      });
      const fromResult2 = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: orderFnErr,
      };
      mockSupabaseFrom.mockReturnValue(fromResult2);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useMovieAvailability('movie-1'), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCountries', () => {
    it('fetches countries ordered by display_order', async () => {
      const countries = [
        { code: 'IN', name: 'India', display_order: 1 },
        { code: 'US', name: 'United States', display_order: 2 },
      ];
      const fromResult = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: countries, error: null }),
      };
      mockSupabaseFrom.mockReturnValue(fromResult);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useCountries(), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(countries);
    });

    it('throws on supabase error', async () => {
      const fromResult = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Countries error') }),
      };
      mockSupabaseFrom.mockReturnValue(fromResult);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useCountries(), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useAddMovieAvailability', () => {
    it('calls crudFetch POST with correct payload', async () => {
      const newRow = makeAvailabilityRow('avail-new', 'movie-1');
      mockCrudFetch.mockResolvedValue(newRow);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAddMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({
          movie_id: 'movie-1',
          platform_id: 'netflix',
          country_code: 'IN',
          availability_type: 'flatrate',
        });
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('POST', {
        table: 'movie_platform_availability',
        data: {
          movie_id: 'movie-1',
          platform_id: 'netflix',
          country_code: 'IN',
          availability_type: 'flatrate',
        },
      });
    });

    it('invalidates movie_availability cache on success', async () => {
      mockCrudFetch.mockResolvedValue(makeAvailabilityRow('avail-new', 'movie-1'));

      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useAddMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({
          movie_id: 'movie-1',
          platform_id: 'netflix',
          country_code: 'IN',
          availability_type: 'flatrate',
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['admin', 'movie_availability', 'movie-1'],
      });
    });

    it('shows alert on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Add failed'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAddMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current
          .mutateAsync({
            movie_id: 'movie-1',
            platform_id: 'netflix',
            country_code: 'IN',
            availability_type: 'flatrate',
          })
          .catch(() => {});
      });

      expect(window.alert).toHaveBeenCalledWith('Add failed');
    });

    it('shows fallback alert when error message is empty', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAddMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current
          .mutateAsync({
            movie_id: 'movie-1',
            platform_id: 'netflix',
            country_code: 'IN',
            availability_type: 'flatrate',
          })
          .catch(() => {});
      });

      expect(window.alert).toHaveBeenCalledWith('Failed to add availability');
    });

    it('passes optional available_from and streaming_url', async () => {
      mockCrudFetch.mockResolvedValue(makeAvailabilityRow('avail-new', 'movie-1'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAddMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({
          movie_id: 'movie-1',
          platform_id: 'netflix',
          country_code: 'IN',
          availability_type: 'flatrate',
          available_from: '2024-01-01',
          streaming_url: 'https://netflix.com/movie',
        });
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('POST', {
        table: 'movie_platform_availability',
        data: expect.objectContaining({
          available_from: '2024-01-01',
          streaming_url: 'https://netflix.com/movie',
        }),
      });
    });
  });

  describe('useUpdateMovieAvailability', () => {
    it('calls crudFetch PATCH with id and updates', async () => {
      const updatedRow = makeAvailabilityRow('avail-1', 'movie-1');
      mockCrudFetch.mockResolvedValue(updatedRow);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useUpdateMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({
          id: 'avail-1',
          movie_id: 'movie-1',
          available_from: '2024-06-01',
        });
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('PATCH', {
        table: 'movie_platform_availability',
        id: 'avail-1',
        data: { available_from: '2024-06-01' },
      });
    });

    it('invalidates movie_availability on success', async () => {
      mockCrudFetch.mockResolvedValue(makeAvailabilityRow('avail-1', 'movie-1'));

      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useUpdateMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ id: 'avail-1', movie_id: 'movie-1' });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['admin', 'movie_availability', 'movie-1'],
      });
    });

    it('shows alert on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Update failed'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useUpdateMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ id: 'avail-1', movie_id: 'movie-1' }).catch(() => {});
      });

      expect(window.alert).toHaveBeenCalledWith('Update failed');
    });

    it('shows fallback alert when error message is empty', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useUpdateMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ id: 'avail-1', movie_id: 'movie-1' }).catch(() => {});
      });

      expect(window.alert).toHaveBeenCalledWith('Failed to update availability');
    });
  });

  describe('useRemoveMovieAvailability', () => {
    it('calls crudFetch DELETE with id', async () => {
      mockCrudFetch.mockResolvedValue(undefined);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRemoveMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ id: 'avail-1', movie_id: 'movie-1' });
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('DELETE', {
        table: 'movie_platform_availability',
        id: 'avail-1',
      });
    });

    it('invalidates movie_availability on success', async () => {
      mockCrudFetch.mockResolvedValue(undefined);

      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useRemoveMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ id: 'avail-1', movie_id: 'movie-1' });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['admin', 'movie_availability', 'movie-1'],
      });
    });

    it('shows alert on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Remove failed'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRemoveMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ id: 'avail-1', movie_id: 'movie-1' }).catch(() => {});
      });

      expect(window.alert).toHaveBeenCalledWith('Remove failed');
    });

    it('shows fallback alert when error message is empty', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRemoveMovieAvailability(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ id: 'avail-1', movie_id: 'movie-1' }).catch(() => {});
      });

      expect(window.alert).toHaveBeenCalledWith('Failed to remove availability');
    });
  });
});
