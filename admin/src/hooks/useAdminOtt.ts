'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { logAudit } from '@/lib/audit-client';
import type { MoviePlatform } from '@/lib/types';

export function useAdminOttReleases() {
  return useQuery({
    queryKey: ['admin', 'ott'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_platforms')
        .select('*, movie:movies(id, title, poster_url), platform:platforms(*)')
        .order('movie_id')
        .limit(5000);
      if (error) throw error;
      return data as MoviePlatform[];
    },
  });
}

export function useCreateOttRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (release: {
      movie_id: string;
      platform_id: string;
      available_from?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('movie_platforms')
        .insert(release)
        .select()
        .single();
      if (error) throw error;
      return data as MoviePlatform;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
      logAudit('create', 'ott_release', `${data.movie_id}-${data.platform_id}`, {
        movie_id: data.movie_id,
        platform_id: data.platform_id,
      });
    },
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
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
      logAudit('delete', 'ott_release', `${variables.movieId}-${variables.platformId}`, {
        movie_id: variables.movieId,
        platform_id: variables.platformId,
      });
    },
  });
}

// Movie-specific platform hooks (for movie edit page)
export function useMoviePlatforms(movieId: string) {
  return useQuery({
    queryKey: ['admin', 'movie_platforms', movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_platforms')
        .select('*, platform:platforms(*)')
        .eq('movie_id', movieId);
      if (error) throw error;
      return data as MoviePlatform[];
    },
    enabled: !!movieId,
  });
}

export function useAddMoviePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (release: {
      movie_id: string;
      platform_id: string;
      available_from?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('movie_platforms')
        .insert(release)
        .select('*, platform:platforms(*)')
        .single();
      if (error) throw error;
      return data as MoviePlatform;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'movie_platforms', data.movie_id] });
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
      logAudit('create', 'ott_release', `${data.movie_id}-${data.platform_id}`, {
        movie_id: data.movie_id,
        platform_id: data.platform_id,
      });
    },
  });
}

export function useRemoveMoviePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ movieId, platformId }: { movieId: string; platformId: string }) => {
      const { error } = await supabase
        .from('movie_platforms')
        .delete()
        .eq('movie_id', movieId)
        .eq('platform_id', platformId);
      if (error) throw error;
      return { movieId, platformId };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'movie_platforms', variables.movieId] });
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
      logAudit('delete', 'ott_release', `${variables.movieId}-${variables.platformId}`, {
        movie_id: variables.movieId,
        platform_id: variables.platformId,
      });
    },
  });
}
