'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createCrudHooks } from '@/hooks/createCrudHooks';
import type { Actor, MovieCast } from '@/lib/types';

const actorsCrud = createCrudHooks<Actor>({
  table: 'actors',
  queryKeyBase: 'actors',
  singleKeyBase: 'actor',
  orderBy: 'name',
  orderAscending: true,
  searchField: 'name',
  enabledFn: (s) => s.length >= 2 || s === '',
});

export const useAdminActors = actorsCrud.usePaginatedList;
export const useAdminActor = actorsCrud.useSingle;
export const useCreateActor = actorsCrud.useCreate;
export const useUpdateActor = actorsCrud.useUpdate;
export const useDeleteActor = actorsCrud.useDelete;

// ── Movie-specific cast hooks (different table, custom logic) ──

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
        .sort((a, b) => (a.role_order ?? 99) - (b.role_order ?? 99));
      return [...cast, ...crew];
    },
    enabled: !!movieId,
  });
}

export function useAddCast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cast: Partial<MovieCast>) => {
      const { data, error } = await supabase.from('movie_cast').insert(cast).select().single();
      if (error) throw error;
      return data as MovieCast;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'cast', variables.movie_id] });
    },
  });
}

export function useRemoveCast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, movieId }: { id: string; movieId: string }) => {
      const { error } = await supabase.from('movie_cast').delete().eq('id', id);
      if (error) throw error;
      return movieId;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'cast', variables.movieId] });
    },
  });
}

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
      const results = await Promise.all(
        items.map((item) =>
          supabase
            .from('movie_cast')
            .update({ display_order: item.display_order })
            .eq('id', item.id),
        ),
      );
      const firstError = results.find((r) => r.error);
      if (firstError?.error) throw firstError.error;
      return movieId;
    },
    onSuccess: (movieId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'cast', movieId] });
    },
  });
}
