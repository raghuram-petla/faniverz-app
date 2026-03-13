'use client';
import { createMovieChildHooks } from './createMovieChildHooks';
import type { MovieVideo } from '@/lib/types';

// @coupling: createMovieChildHooks — movie-scoped CRUD via generic child factory
// @contract: display_order ascending (default) — videos appear in admin-configured order
const {
  useList: useMovieVideos,
  useAdd: useAddVideo,
  useUpdate: useUpdateVideo,
  useRemove: useRemoveVideo,
} = createMovieChildHooks<MovieVideo>({
  table: 'movie_videos',
  keySuffix: 'videos',
  orderBy: 'display_order',
});

export { useMovieVideos, useAddVideo, useUpdateVideo, useRemoveVideo };
