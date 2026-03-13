'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';

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
}

/**
 * Factory for movie child-resource hooks (list by movieId, add, update, remove).
 * Used by videos, posters, theatrical-runs, and production-houses.
 *
 * @contract Returns { useList, useAdd, useUpdate, useRemove } — each is a standalone React hook
 * @coupling Depends on Supabase table having 'movie_id' FK and 'id' PK columns
 * @boundary All Supabase errors are thrown; mutations show window.alert on failure
 */
export function createMovieChildHooks<T>(config: MovieChildConfig) {
  const {
    table,
    keySuffix,
    orderBy = 'display_order',
    orderAscending = true,
    select = '*',
  } = config;

  const queryKey = (movieId: string) => ['admin', keySuffix, movieId] as const;

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

  // @sideeffect Inserts row, then invalidates list cache for the item's movie_id
  function useAdd() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (item: Partial<T>) => {
        const { data, error } = await supabase.from(table).insert(item).select().single();
        if (error) throw error;
        return data as T;
      },
      // @assumes variables always contains movie_id — caller must include it
      onSuccess: (_data: T, variables: Partial<T>) => {
        const movieId = (variables as Record<string, unknown>).movie_id as string;
        qc.invalidateQueries({ queryKey: queryKey(movieId) });
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  // @contract Caller must pass { id, movieId } alongside update fields; movieId is stripped before DB update
  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({
        id,
        movieId,
        ...item
      }: Partial<T> & { id: string; movieId: string }) => {
        const { data, error } = await supabase
          .from(table)
          .update(item)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return { ...data, movieId } as T & { movieId: string };
      },
      onSuccess: (data: T & { movieId: string }) => {
        qc.invalidateQueries({ queryKey: queryKey(data.movieId) });
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  // @sideeffect Deletes row by composite key (id + movie_id) to prevent cross-movie deletion
  function useRemove() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, movieId }: { id: string; movieId: string }) => {
        const { error } = await supabase.from(table).delete().eq('id', id).eq('movie_id', movieId);
        if (error) throw error;
        return movieId;
      },
      onSuccess: (_data: string, variables: { id: string; movieId: string }) => {
        qc.invalidateQueries({ queryKey: queryKey(variables.movieId) });
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  return { useList, useAdd, useUpdate, useRemove };
}
