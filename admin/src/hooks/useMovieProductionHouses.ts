'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crudFetch } from '@/lib/admin-crud-client';
import { createMovieChildHooks } from './createMovieChildHooks';
import type { ProductionHouse } from '@/lib/types';

// @contract: represents a junction row with its resolved production_house relation
export interface MovieProductionHouse {
  movie_id: string;
  production_house_id: string;
  production_house: ProductionHouse;
}

// @coupling: createMovieChildHooks — only useList used; add/remove are custom below
// @boundary: select joins production_houses via PostgREST foreign-key embed
// @edge: movie_production_houses has no display_order column — order by FK instead
const { useList: useMovieProductionHouses } = createMovieChildHooks<MovieProductionHouse>({
  table: 'movie_production_houses',
  keySuffix: 'movie-production-houses',
  select: '*, production_house:production_houses(*)',
  orderBy: 'production_house_id',
});

export { useMovieProductionHouses };

// @sideeffect: inserts junction row via /api/admin-crud; invalidates cache on success
// @edge: duplicate insert will throw due to composite primary key constraint
export function useAddMovieProductionHouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      movieId,
      productionHouseId,
    }: {
      movieId: string;
      productionHouseId: string;
    }) => {
      await crudFetch('POST', {
        table: 'movie_production_houses',
        data: { movie_id: movieId, production_house_id: productionHouseId },
      });
      return { movieId, productionHouseId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: ['admin', 'movie-production-houses', data.movieId],
      });
      // @sideeffect: PH-scoped movie/OTT lists depend on junction table
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
      // @sideeffect: PH-scoped dashboard totalMovies counts via junction table
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}

// @sideeffect: deletes junction row by composite key via /api/admin-crud filters
export function useRemoveMovieProductionHouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      movieId,
      productionHouseId,
    }: {
      movieId: string;
      productionHouseId: string;
    }) => {
      await crudFetch('DELETE', {
        table: 'movie_production_houses',
        filters: { movie_id: movieId, production_house_id: productionHouseId },
      });
      return { movieId, productionHouseId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: ['admin', 'movie-production-houses', data.movieId],
      });
      // @sideeffect: PH-scoped movie/OTT lists depend on junction table
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'ott'] });
      // @sideeffect: PH-scoped dashboard totalMovies counts via junction table
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}
