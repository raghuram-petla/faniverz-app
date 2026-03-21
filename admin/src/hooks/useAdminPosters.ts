'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crudFetch } from '@/lib/admin-crud-client';
import { createMovieChildHooks } from './createMovieChildHooks';
import type { MoviePoster } from '@/lib/types';

// @coupling: createMovieChildHooks — movie-scoped CRUD via generic child factory
const {
  useList: useMoviePosters,
  useAdd: useAddPoster,
  useUpdate: useUpdatePoster,
  useRemove: useRemovePoster,
} = createMovieChildHooks<MoviePoster>({
  table: 'movie_images',
  keySuffix: 'images',
  orderBy: 'display_order',
});

export { useMoviePosters, useAddPoster, useUpdatePoster, useRemovePoster };

// @sideeffect: mutates movie_images (unset old, set new) AND movies.poster_url
// @invariant: at most one image per movie can have is_main_poster=true (DB partial unique index)
// @edge: first unset may silently match zero rows if no main poster exists yet
export function useSetMainPoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, movieId }: { id: string; movieId: string }) => {
      // Unset existing main poster (partial unique index enforces at most one)
      await crudFetch('PATCH', {
        table: 'movie_images',
        filters: { movie_id: movieId, is_main_poster: true },
        data: { is_main_poster: false },
        returnOne: false,
      });

      // Set new main poster
      const data = await crudFetch<MoviePoster>('PATCH', {
        table: 'movie_images',
        id,
        data: { is_main_poster: true },
      });

      // @coupling: keeps movies.poster_url + poster_image_type in sync
      await crudFetch('PATCH', {
        table: 'movies',
        id: movieId,
        data: { poster_url: data.image_url, poster_image_type: data.image_type },
      });

      return { ...data, movieId } as MoviePoster & { movieId: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'images', data.movieId] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie', data.movieId] });
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to set main poster');
    },
  });
}

// @sideeffect: mutates movie_images (unset old, set new) AND movies.backdrop_url
// @invariant: at most one image per movie can have is_main_backdrop=true (DB partial unique index)
// @edge: first unset may silently match zero rows if no main backdrop exists yet
export function useSetMainBackdrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, movieId }: { id: string; movieId: string }) => {
      // Unset existing main backdrop (partial unique index enforces at most one)
      await crudFetch('PATCH', {
        table: 'movie_images',
        filters: { movie_id: movieId, is_main_backdrop: true },
        data: { is_main_backdrop: false },
        returnOne: false,
      });

      // Set new main backdrop
      const data = await crudFetch<MoviePoster>('PATCH', {
        table: 'movie_images',
        id,
        data: { is_main_backdrop: true },
      });

      // @coupling: keeps movies.backdrop_url in sync with the main backdrop's image_url
      await crudFetch('PATCH', {
        table: 'movies',
        id: movieId,
        data: { backdrop_url: data.image_url, backdrop_image_type: data.image_type },
      });

      return { ...data, movieId } as MoviePoster & { movieId: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'images', data.movieId] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie', data.movieId] });
      // @sideeffect: backdrop_url is displayed in movie detail views
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to set main backdrop');
    },
  });
}
