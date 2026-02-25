'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { Actor, MovieCast } from '@/lib/types';

export function useAdminActors() {
  return useQuery({
    queryKey: ['admin', 'actors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('actors').select('*').order('name');
      if (error) throw error;
      return data as Actor[];
    },
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
      // Cast: sort by actor's industry tier_rank ASC, then birth_date ASC (older first within same tier)
      const cast = all
        .filter((c) => c.credit_type === 'cast')
        .sort((a, b) => {
          const tierDiff = (a.actor?.tier_rank ?? 99) - (b.actor?.tier_rank ?? 99);
          if (tierDiff !== 0) return tierDiff;
          const dateA = a.actor?.birth_date ? new Date(a.actor.birth_date).getTime() : Infinity;
          const dateB = b.actor?.birth_date ? new Date(b.actor.birth_date).getTime() : Infinity;
          return dateA - dateB;
        });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'actors'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'actors'] }),
  });
}

export function useDeleteActor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('actors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'actors'] }),
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
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['admin', 'cast', variables.movie_id] }),
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
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['admin', 'cast', variables.movieId] }),
  });
}
