'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import type { MoviePlatform } from '@/lib/types';

// Movie-specific platform hooks (for movie edit page)
// @boundary scoped to a single movie, no PH check needed
// @coupling JOINs movie_platforms + platforms via PostgREST foreign-key embed
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

// @sideeffect Invalidates both movie-specific AND global OTT caches
// @coupling Also invalidates platform-movie-ids — used by useAdminMovies 'streaming'/'released' filters
export function useAddMoviePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (release: {
      movie_id: string;
      platform_id: string;
      available_from?: string | null;
      streaming_url?: string | null;
    }) => {
      return crudFetch<MoviePlatform>('POST', { table: 'movie_platforms', data: release });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'movie_platforms', data.movie_id] });
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
      qc.invalidateQueries({ queryKey: ['admin', 'platform-movie-ids'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

// @sideeffect Deletes by composite key, invalidates both caches
export function useRemoveMoviePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ movieId, platformId }: { movieId: string; platformId: string }) => {
      await crudFetch('DELETE', {
        table: 'movie_platforms',
        filters: { movie_id: movieId, platform_id: platformId },
      });
      return { movieId, platformId };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'movie_platforms', variables.movieId] });
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
      qc.invalidateQueries({ queryKey: ['admin', 'platform-movie-ids'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}
