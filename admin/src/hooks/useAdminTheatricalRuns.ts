'use client';
import { createMovieChildHooks } from './createMovieChildHooks';
import type { MovieTheatricalRun } from '@/lib/types';

// @coupling: createMovieChildHooks — movie-scoped CRUD via generic child factory
// @contract: release_date ascending — earliest theatrical run appears first
const {
  useList: useMovieTheatricalRuns,
  useAdd: useAddTheatricalRun,
  useUpdate: useUpdateTheatricalRun,
  useRemove: useRemoveTheatricalRun,
} = createMovieChildHooks<MovieTheatricalRun>({
  table: 'movie_theatrical_runs',
  keySuffix: 'theatrical-runs',
  orderBy: 'release_date',
  orderAscending: true,
  // @sideeffect: theatrical run changes affect In Theaters page views
  extraInvalidateKeys: [
    ['admin', 'theater-movies'],
    ['admin', 'upcoming-movies'],
    ['admin', 'upcoming-rereleases'],
    ['admin', 'theater-search'],
  ],
});

export {
  useMovieTheatricalRuns,
  useAddTheatricalRun,
  useUpdateTheatricalRun,
  useRemoveTheatricalRun,
};
