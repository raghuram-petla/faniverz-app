'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { logAdminAction } from '@/lib/audit';

export function useAdminMovies(options?: {
  search?: string;
  status?: string;
  releaseType?: string;
}) {
  return useQuery({
    queryKey: ['admin-movies', options],
    queryFn: async () => {
      let query = supabase
        .from('movies')
        .select('*')
        .order('release_date', { ascending: false })
        .limit(100);

      if (options?.search) {
        query = query.or(`title.ilike.%${options.search}%,title_te.ilike.%${options.search}%`);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.releaseType) {
        query = query.eq('release_type', options.releaseType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminMovieDetail(movieId: number) {
  return useQuery({
    queryKey: ['admin-movie', movieId],
    queryFn: async () => {
      const { data, error } = await supabase.from('movies').select('*').eq('id', movieId).single();
      if (error) throw error;
      return data;
    },
    enabled: movieId > 0,
  });
}

export function useUpdateMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('movies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await logAdminAction('update', 'movie', data.id);
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movie', data.id] });
    },
  });
}

export function useCreateMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movie: Record<string, unknown>) => {
      const { data, error } = await supabase.from('movies').insert(movie).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await logAdminAction('create', 'movie', data.id);
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
    },
  });
}
