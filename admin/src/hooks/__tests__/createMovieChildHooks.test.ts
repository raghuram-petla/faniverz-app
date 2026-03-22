import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockCrudFetch = vi.fn();
const mockSupabaseFrom = vi.fn();

vi.mock('@/lib/admin-crud-client', () => ({
  crudFetch: (...args: unknown[]) => mockCrudFetch(...args),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

import { createMovieChildHooks } from '@/hooks/createMovieChildHooks';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

// Make a simple chainable Supabase query that resolves with given value at .order()
function makeQueryChain(resolvedValue: unknown) {
  const order = vi.fn().mockResolvedValue(resolvedValue);
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

describe('createMovieChildHooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  describe('useList', () => {
    it('fetches list from supabase for given movieId', async () => {
      const items = [{ id: 'v-1', movie_id: 'movie-1', title: 'Trailer' }];
      mockSupabaseFrom.mockReturnValueOnce(makeQueryChain({ data: items, error: null }));

      const { useList } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useList('movie-1'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(items);
    });

    it('does not fetch when movieId is empty', async () => {
      const { useList } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useList(''), { wrapper: Wrapper });

      await new Promise((r) => setTimeout(r, 50));
      expect(result.current.isLoading).toBe(false);
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('uses custom orderBy and select when configured', async () => {
      const items = [{ id: 'p-1', movie_id: 'movie-1', display_order: 0, image_url: 'x.jpg' }];
      // We'll track the chain calls
      const order = vi.fn().mockResolvedValue({ data: items, error: null });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      mockSupabaseFrom.mockReturnValueOnce({ select });

      const { useList } = createMovieChildHooks({
        table: 'movie_images',
        keySuffix: 'images',
        orderBy: 'display_order',
        select: 'id, image_url, display_order',
        orderAscending: false,
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useList('movie-1'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(select).toHaveBeenCalledWith('id, image_url, display_order');
      expect(order).toHaveBeenCalledWith('display_order', { ascending: false });
    });

    it('throws error when query fails', async () => {
      const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      mockSupabaseFrom.mockReturnValueOnce({ select });

      const { useList } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useList('movie-1'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useAdd', () => {
    it('calls crudFetch POST and invalidates query on success', async () => {
      const item = { movie_id: 'movie-1', youtube_id: 'abc', title: 'Trailer' };
      mockCrudFetch.mockResolvedValue(item);
      mockSupabaseFrom.mockReturnValue(makeQueryChain({ data: [], error: null }));

      const { useAdd } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { qc, Wrapper } = makeWrapper();
      const invalidate = vi.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useAdd(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync(item);
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('POST', { table: 'movie_videos', data: item });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'videos', 'movie-1'] });
    });

    it('calls alert on mutation error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Insert failed'));

      const { useAdd } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAdd(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ movie_id: 'movie-1' });
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Insert failed'));
    });

    it('shows "Operation failed" when add error has empty message', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { useAdd } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAdd(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ movie_id: 'movie-1' });
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Operation failed'));
    });

    it('invalidates extraInvalidateKeys on success', async () => {
      const item = { movie_id: 'movie-1', platform_id: 'netflix' };
      mockCrudFetch.mockResolvedValue(item);
      mockSupabaseFrom.mockReturnValue(makeQueryChain({ data: [], error: null }));

      const { useAdd } = createMovieChildHooks({
        table: 'movie_platforms',
        keySuffix: 'platforms',
        extraInvalidateKeys: [['admin', 'movie', 'movie-1']],
      });
      const { qc, Wrapper } = makeWrapper();
      const invalidate = vi.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useAdd(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync(item);
      });

      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'movie', 'movie-1'] });
    });
  });

  describe('useUpdate', () => {
    it('calls crudFetch PATCH and invalidates query on success', async () => {
      const updatedItem = { id: 'v-1', movieId: 'movie-1', title: 'Updated Trailer' };
      mockCrudFetch.mockResolvedValue({ id: 'v-1', title: 'Updated Trailer' });
      mockSupabaseFrom.mockReturnValue(makeQueryChain({ data: [], error: null }));

      const { useUpdate } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { qc, Wrapper } = makeWrapper();
      const invalidate = vi.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useUpdate(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync(updatedItem);
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('PATCH', {
        table: 'movie_videos',
        id: 'v-1',
        data: { title: 'Updated Trailer' },
      });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'videos', 'movie-1'] });
    });

    it('calls alert on update error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Patch failed'));

      const { useUpdate } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useUpdate(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'v-1', movieId: 'movie-1' } as never);
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Patch failed'));
    });

    it('shows "Operation failed" when update error has empty message', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { useUpdate } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useUpdate(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'v-1', movieId: 'movie-1' } as never);
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Operation failed'));
    });
  });

  describe('useRemove', () => {
    it('calls crudFetch DELETE and invalidates query on success', async () => {
      mockCrudFetch.mockResolvedValue({ success: true });
      mockSupabaseFrom.mockReturnValue(makeQueryChain({ data: [], error: null }));

      const { useRemove } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { qc, Wrapper } = makeWrapper();
      const invalidate = vi.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useRemove(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 'v-1', movieId: 'movie-1' });
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('DELETE', { table: 'movie_videos', id: 'v-1' });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'videos', 'movie-1'] });
    });

    it('calls alert on remove error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Delete failed'));

      const { useRemove } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRemove(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'v-1', movieId: 'movie-1' });
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Delete failed'));
    });

    it('shows fallback alert message when error has no message', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { useRemove } = createMovieChildHooks({ table: 'movie_videos', keySuffix: 'videos' });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRemove(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'v-1', movieId: 'movie-1' });
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Operation failed'));
    });
  });
});
