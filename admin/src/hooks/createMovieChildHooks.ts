'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';

export interface MovieChildConfig {
  /** Supabase table name */
  table: string;
  /** Query key suffix, e.g. 'videos' → ['admin', 'videos', movieId] */
  keySuffix: string;
  /** Column to order by (default: 'display_order') */
  orderBy?: string;
  /** Sort ascending (default: true) */
  orderAscending?: boolean;
  /** Custom select string (default: '*') */
  select?: string;
  /** Additional query key prefixes to invalidate on any mutation */
  extraInvalidateKeys?: readonly string[][];
}

/**
 * Factory for movie child-resource hooks (list by movieId, add, update, remove).
 * Used by videos, posters, theatrical-runs, and production-houses.
 *
 * @contract Returns { useList, useAdd, useUpdate, useRemove } — each is a standalone React hook
 * @coupling Depends on Supabase table having 'movie_id' FK and 'id' PK columns
 * @boundary Reads via Supabase browser client; writes via /api/admin-crud (service role)
 */
export function createMovieChildHooks<T>(config: MovieChildConfig) {
  const {
    table,
    keySuffix,
    orderBy = 'display_order',
    orderAscending = true,
    select = '*',
    extraInvalidateKeys = [],
  } = config;

  const queryKey = (movieId: string) => ['admin', keySuffix, movieId] as const;

  function invalidateExtra(qc: ReturnType<typeof useQueryClient>) {
    for (const key of extraInvalidateKeys) {
      qc.invalidateQueries({ queryKey: key });
    }
  }

  function useList(movieId: string) {
    return useQuery({
      queryKey: queryKey(movieId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from(table)
          .select(select)
          .eq('movie_id', movieId)
          .order(orderBy, { ascending: orderAscending });
        if (error) throw error;
        return data as unknown as T[];
      },
      enabled: !!movieId,
    });
  }

  // @sideeffect Inserts row via /api/admin-crud, then invalidates list cache
  function useAdd() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (item: Partial<T>) => {
        return crudFetch<T>('POST', { table, data: item });
      },
      // @assumes variables always contains movie_id — caller must include it
      onSuccess: (_data: T, variables: Partial<T>) => {
        const movieId = (variables as Record<string, unknown>).movie_id as string;
        qc.invalidateQueries({ queryKey: queryKey(movieId) });
        invalidateExtra(qc);
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  // @contract Caller must pass { id, movieId } alongside update fields
  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({
        id,
        movieId,
        ...item
      }: Partial<T> & { id: string; movieId: string }) => {
        const row = await crudFetch<T>('PATCH', { table, id, data: item });
        return { ...row, movieId } as T & { movieId: string };
      },
      onSuccess: (data: T & { movieId: string }) => {
        qc.invalidateQueries({ queryKey: queryKey(data.movieId) });
        invalidateExtra(qc);
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  // @sideeffect Deletes row via /api/admin-crud by id
  function useRemove() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, movieId }: { id: string; movieId: string }) => {
        await crudFetch<{ success: true }>('DELETE', { table, id });
        return movieId;
      },
      onSuccess: (_data: string, variables: { id: string; movieId: string }) => {
        qc.invalidateQueries({ queryKey: queryKey(variables.movieId) });
        invalidateExtra(qc);
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  return { useList, useAdd, useUpdate, useRemove };
}
