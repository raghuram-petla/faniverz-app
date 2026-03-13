'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { MoviePlatform } from '@/lib/types';

/**
 * List OTT releases. PH admins only see releases for their PH's movies.
 *
 * @coupling Joins movie_production_houses for PH scoping + platforms for display data
 * @nullable productionHouseIds — omitted means full admin access (no PH filter)
 */
export function useAdminOttReleases(productionHouseIds?: string[]) {
  const hasPHScope = productionHouseIds && productionHouseIds.length > 0;

  return useQuery({
    queryKey: ['admin', 'ott', productionHouseIds],
    queryFn: async () => {
      if (hasPHScope) {
        const { data: junctionData, error: jErr } = await supabase
          .from('movie_production_houses')
          .select('movie_id')
          .in('production_house_id', productionHouseIds);
        if (jErr) throw jErr;
        const movieIds = [...new Set((junctionData ?? []).map((r) => r.movie_id))];
        if (movieIds.length === 0) return [] as MoviePlatform[];

        const { data, error } = await supabase
          .from('movie_platforms')
          .select('*, movie:movies(id, title, poster_url), platform:platforms(*)')
          .in('movie_id', movieIds)
          .order('movie_id');
        if (error) throw error;
        return data as MoviePlatform[];
      }

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
      streaming_url?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('movie_platforms')
        .insert(release)
        .select()
        .single();
      if (error) throw error;
      return data as MoviePlatform;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

// @contract Uses composite key (movie_id + platform_id) — no surrogate 'id' column
export function useUpdateOttRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      movieId,
      platformId,
      available_from,
      streaming_url,
    }: {
      movieId: string;
      platformId: string;
      available_from: string | null;
      streaming_url: string | null;
    }) => {
      const { data, error } = await supabase
        .from('movie_platforms')
        .update({ available_from, streaming_url })
        .eq('movie_id', movieId)
        .eq('platform_id', platformId)
        .select()
        .single();
      if (error) throw error;
      return data as MoviePlatform;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

// Movie-specific platform hooks (for movie edit page)
// @boundary Separate from useAdminOttReleases — scoped to a single movie, no PH check needed
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

// @sideeffect Invalidates both movie-specific AND global OTT caches to keep both views fresh
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
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

// @sideeffect Deletes by composite key (movie_id + platform_id), invalidates both caches
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
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}
