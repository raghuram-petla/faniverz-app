'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { MoviePlatform } from '@/lib/types';

export function useAdminOttReleases() {
  return useQuery({
    queryKey: ['admin', 'ott'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_platforms')
        .select('*, movie:movies(id, title, poster_url), platform:platforms(*)')
        .order('movie_id');
      if (error) throw error;
      return data as MoviePlatform[];
    },
  });
}

export function useCreateOttRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (release: { movie_id: string; platform_id: string }) => {
      const { data, error } = await supabase
        .from('movie_platforms')
        .insert(release)
        .select()
        .single();
      if (error) throw error;
      return data as MoviePlatform;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ott'] }),
  });
}

export function useDeleteOttRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ movieId, platformId }: { movieId: string; platformId: string }) => {
      const { error } = await supabase
        .from('movie_platforms')
        .delete()
        .eq('movie_id', movieId)
        .eq('platform_id', platformId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ott'] }),
  });
}
