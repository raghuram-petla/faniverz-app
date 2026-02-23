'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { Movie } from '@/lib/types';

export function useAdminMovies() {
  return useQuery({
    queryKey: ['admin', 'movies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('release_date', { ascending: false });
      if (error) throw error;
      return data as Movie[];
    },
  });
}

export function useAdminMovie(id: string) {
  return useQuery({
    queryKey: ['admin', 'movie', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('movies').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Movie;
    },
    enabled: !!id,
  });
}

export function useCreateMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (movie: Partial<Movie>) => {
      const { data, error } = await supabase.from('movies').insert(movie).select().single();
      if (error) throw error;
      return data as Movie;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'movies'] }),
  });
}

export function useUpdateMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...movie }: Partial<Movie> & { id: string }) => {
      const { data, error } = await supabase
        .from('movies')
        .update(movie)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Movie;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'movies'] }),
  });
}

export function useDeleteMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('movies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'movies'] }),
  });
}
