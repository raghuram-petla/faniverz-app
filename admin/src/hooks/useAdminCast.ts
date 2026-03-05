'use client';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { Actor, MovieCast } from '@/lib/types';

const PAGE_SIZE = 50;

export function useAdminActors(search = '') {
  return useInfiniteQuery({
    queryKey: ['admin', 'actors', search],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase.from('actors').select('*').order('name').range(from, to);
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Actor[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
    enabled: search.length >= 2 || search === '',
  });
}

export function useAdminActor(id: string) {
  return useQuery({
    queryKey: ['admin', 'actor', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('actors').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Actor;
    },
    enabled: !!id,
  });
}

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
      // Cast: sort by display_order ASC (per-movie billing from TMDB)
      const cast = all
        .filter((c) => c.credit_type === 'cast')
        .sort((a, b) => a.display_order - b.display_order);
      // Crew: sort by role_order ASC
      const crew = all
        .filter((c) => c.credit_type === 'crew')
        .sort((a, b) => (a.role_order ?? 99) - (b.role_order ?? 99));
      return [...cast, ...crew];
    },
    enabled: !!movieId,
  });
}

export function useCreateActor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (actor: Partial<Actor>) => {
      const { data, error } = await supabase.from('actors').insert(actor).select().single();
      if (error) throw error;
      return data as Actor;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
    },
  });
}

export function useUpdateActor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...actor }: Partial<Actor> & { id: string }) => {
      const { data, error } = await supabase
        .from('actors')
        .update(actor)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Actor;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actor', data.id] });
    },
  });
}

export function useDeleteActor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('actors').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actor', id] });
    },
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
