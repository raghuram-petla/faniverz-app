'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import { createCrudHooks } from '@/hooks/createCrudHooks';
import type { Actor, MovieCast } from '@/lib/types';

// @coupling: createCrudHooks — paginated list/single/create/update/delete for actors table
// @edge: enabledFn skips queries for 1-char search strings to avoid noisy partial matches
// @sideeffect Actor name/photo changes affect cast views that JOIN with actors table
const actorsCrud = createCrudHooks<Actor>({
  table: 'actors',
  queryKeyBase: 'actors',
  singleKeyBase: 'actor',
  orderBy: 'name',
  orderAscending: true,
  searchField: 'name',
  enabledFn: (s) => s.length >= 2 || s === '',
  // @sideeffect: actor create/delete changes totalActors in dashboard
  extraInvalidateKeys: [
    ['admin', 'cast'],
    ['admin', 'dashboard'],
  ],
});

export const useAdminActors = actorsCrud.usePaginatedList;
export const useAdminActor = actorsCrud.useSingle;
export const useCreateActor = actorsCrud.useCreate;
export const useUpdateActor = actorsCrud.useUpdate;
export const useDeleteActor = actorsCrud.useDelete;

// ── Movie-specific cast hooks (different table, custom logic) ──

// @contract: returns cast sorted by display_order, then crew sorted by role_order; cast before crew
// @boundary: joins movie_cast with actors via PostgREST foreign-key embed
// @assumes: credit_type is either 'cast' or 'crew' — other values are silently excluded
export function useMovieCast(movieId: string) {
  return useQuery({
    queryKey: ['admin', 'cast', movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_cast')
        .select('*, actor:actors(*)')
        .eq('movie_id', movieId);
      if (error) throw error;
      const all = (data ?? []) as MovieCast[];
      const cast = all
        .filter((c) => c.credit_type === 'cast')
        .sort((a, b) => a.display_order - b.display_order);
      const crew = all
        .filter((c) => c.credit_type === 'crew')
        // @edge: null role_order defaults to 99 to push unordered crew to the end
        .sort((a, b) => (a.role_order ?? 99) - (b.role_order ?? 99));
      return [...cast, ...crew];
    },
    enabled: !!movieId,
  });
}

// @sideeffect: inserts into movie_cast via /api/admin-crud and invalidates cache
// @assumes: cast partial must include movie_id, actor_id, credit_type at minimum
export function useAddCast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cast: Partial<MovieCast>) => {
      return crudFetch<MovieCast>('POST', { table: 'movie_cast', data: cast });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'cast', variables.movie_id] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

// @sideeffect: hard-deletes movie_cast row via /api/admin-crud
export function useRemoveCast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, movieId }: { id: string; movieId: string }) => {
      await crudFetch<{ success: true }>('DELETE', { table: 'movie_cast', id });
      return movieId;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'cast', variables.movieId] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

// @sideeffect: updates display_order for each cast item via /api/admin-crud
// @edge: partial failure — some items may update before the first error is detected
// @sync: all updates run in parallel via Promise.all; no transaction wrapping
export function useUpdateCastOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      movieId,
      items,
    }: {
      movieId: string;
      items: { id: string; display_order: number }[];
    }) => {
      await Promise.all(
        items.map((item) =>
          crudFetch('PATCH', {
            table: 'movie_cast',
            id: item.id,
            data: { display_order: item.display_order },
          }),
        ),
      );
      return movieId;
    },
    onSuccess: (movieId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'cast', movieId] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}
