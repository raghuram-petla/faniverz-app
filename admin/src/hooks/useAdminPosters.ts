'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { MoviePoster } from '@/lib/types';

export function useMoviePosters(movieId: string) {
  return useQuery({
    queryKey: ['admin', 'posters', movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_posters')
        .select('*')
        .eq('movie_id', movieId)
        .order('display_order');
      if (error) throw error;
      return data as MoviePoster[];
    },
    enabled: !!movieId,
  });
}

export function useAddPoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poster: Partial<MoviePoster>) => {
      const { data, error } = await supabase.from('movie_posters').insert(poster).select().single();
      if (error) throw error;
      return data as MoviePoster;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'posters', variables.movie_id] });
    },
  });
}

export function useUpdatePoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      movieId,
      ...poster
    }: Partial<MoviePoster> & { id: string; movieId: string }) => {
      const { data, error } = await supabase
        .from('movie_posters')
        .update(poster)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, movieId } as MoviePoster & { movieId: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'posters', data.movieId] });
    },
  });
}

export function useRemovePoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, movieId }: { id: string; movieId: string }) => {
      const { error } = await supabase.from('movie_posters').delete().eq('id', id);
      if (error) throw error;
      return movieId;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'posters', variables.movieId] });
    },
  });
}

export function useSetMainPoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, movieId }: { id: string; movieId: string }) => {
      // Unset existing main poster (partial unique index enforces at most one)
      await supabase
        .from('movie_posters')
        .update({ is_main: false })
        .eq('movie_id', movieId)
        .eq('is_main', true);

      // Set new main poster
      const { data, error } = await supabase
        .from('movie_posters')
        .update({ is_main: true })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Sync poster_url to movies table
      await supabase.from('movies').update({ poster_url: data.image_url }).eq('id', movieId);

      return { ...data, movieId } as MoviePoster & { movieId: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'posters', data.movieId] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie', data.movieId] });
    },
  });
}
