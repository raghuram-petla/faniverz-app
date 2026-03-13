'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createMovieChildHooks } from './createMovieChildHooks';
import type { MoviePoster } from '@/lib/types';

// @coupling: createMovieChildHooks — movie-scoped CRUD via generic child factory
const {
  useList: useMoviePosters,
  useAdd: useAddPoster,
  useUpdate: useUpdatePoster,
  useRemove: useRemovePoster,
} = createMovieChildHooks<MoviePoster>({
  table: 'movie_posters',
  keySuffix: 'posters',
  orderBy: 'display_order',
});

export { useMoviePosters, useAddPoster, useUpdatePoster, useRemovePoster };

// @sideeffect: mutates movie_posters (unset old, set new) AND movies.poster_url
// @invariant: at most one poster per movie can have is_main=true (DB partial unique index)
// @edge: first unset may silently match zero rows if no main poster exists yet
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

      // @coupling: keeps movies.poster_url in sync with the main poster's image_url
      // Sync poster_url to movies table
      await supabase.from('movies').update({ poster_url: data.image_url }).eq('id', movieId);

      return { ...data, movieId } as MoviePoster & { movieId: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'posters', data.movieId] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie', data.movieId] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to set main poster');
    },
  });
}
