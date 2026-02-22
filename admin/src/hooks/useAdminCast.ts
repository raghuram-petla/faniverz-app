'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { logAdminAction } from '@/lib/audit';

export function useAdminCast(options?: { role?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin-cast', options],
    queryFn: async () => {
      let query = supabase
        .from('movie_cast')
        .select('*')
        .order('name', { ascending: true })
        .limit(200);

      if (options?.role) {
        query = query.eq('role', options.role);
      }
      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,name_te.ilike.%${options.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by tmdb_person_id to deduplicate
      const grouped = new Map<number, (typeof data)[0] & { movie_count: number }>();
      for (const cast of data) {
        const key = cast.tmdb_person_id;
        if (!grouped.has(key)) {
          grouped.set(key, { ...cast, movie_count: 1 });
        } else {
          grouped.get(key)!.movie_count++;
        }
      }

      return Array.from(grouped.values());
    },
  });
}

export function useAdminCastDetail(tmdbPersonId: number) {
  return useQuery({
    queryKey: ['admin-cast-detail', tmdbPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_cast')
        .select('*, movies(id, title, title_te)')
        .eq('tmdb_person_id', tmdbPersonId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: tmdbPersonId > 0,
  });
}

export function useUpdateCast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tmdbPersonId,
      updates,
    }: {
      tmdbPersonId: number;
      updates: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('movie_cast')
        .update(updates)
        .eq('tmdb_person_id', tmdbPersonId)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      if (data.length > 0) {
        await logAdminAction('update', 'cast', data[0].tmdb_person_id);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-cast'] });
      queryClient.invalidateQueries({ queryKey: ['admin-cast-detail'] });
    },
  });
}

export function useMovieCast(movieId: number) {
  return useQuery({
    queryKey: ['admin-movie-cast', movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_cast')
        .select('*')
        .eq('movie_id', movieId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: movieId > 0,
  });
}

export function useAddCastToMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (castEntry: Record<string, unknown>) => {
      const { data, error } = await supabase.from('movie_cast').insert(castEntry).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await logAdminAction('create', 'cast', data.id);
      queryClient.invalidateQueries({ queryKey: ['admin-movie-cast', data.movie_id] });
    },
  });
}

export function useRemoveCastFromMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, movieId }: { id: number; movieId: number }) => {
      const { error } = await supabase.from('movie_cast').delete().eq('id', id);
      if (error) throw error;
      return { id, movieId };
    },
    onSuccess: async ({ id, movieId }) => {
      await logAdminAction('delete', 'cast', id);
      queryClient.invalidateQueries({ queryKey: ['admin-movie-cast', movieId] });
    },
  });
}
