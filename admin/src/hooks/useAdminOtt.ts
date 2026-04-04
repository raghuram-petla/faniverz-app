'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import { createSimpleMutation } from '@/hooks/createSimpleMutation';
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

// @contract createSimpleMutation — invalidates movie-specific, global OTT, and platform-movie-ids caches
// @sideeffect Invalidates both movie-specific AND global OTT caches
// @coupling Also invalidates platform-movie-ids — used by useAdminMovies 'streaming'/'released' filters
export const useAddMoviePlatform = createSimpleMutation<
  {
    movie_id: string;
    platform_id: string;
    available_from?: string | null;
    streaming_url?: string | null;
  },
  MoviePlatform
>({
  mutationFn: (release) =>
    crudFetch<MoviePlatform>('POST', { table: 'movie_platforms', data: release }),
  // @contract getInvalidateKeys uses data.movie_id to scope invalidation to the affected movie
  // @sideeffect: also invalidates platform-filter-ids (movie list platform filter)
  getInvalidateKeys: (data) => [
    ['admin', 'movie_platforms', data.movie_id],
    ['admin', 'ott'],
    ['admin', 'platform-movie-ids'],
    ['admin', 'platform-filter-ids'],
  ],
});

// @contract createSimpleMutation — deletes by composite key and invalidates both caches
// @sideeffect Deletes by composite key, invalidates both caches
export const useRemoveMoviePlatform = createSimpleMutation<
  { movieId: string; platformId: string },
  { movieId: string; platformId: string }
>({
  mutationFn: async ({ movieId, platformId }) => {
    await crudFetch('DELETE', {
      table: 'movie_platforms',
      filters: { movie_id: movieId, platform_id: platformId },
    });
    return { movieId, platformId };
  },
  // @contract getInvalidateKeys uses variables.movieId (passed through return) to scope invalidation
  // @sideeffect: also invalidates platform-filter-ids (movie list platform filter)
  getInvalidateKeys: (data) => [
    ['admin', 'movie_platforms', data.movieId],
    ['admin', 'ott'],
    ['admin', 'platform-movie-ids'],
    ['admin', 'platform-filter-ids'],
  ],
});
