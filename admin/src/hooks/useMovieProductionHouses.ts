'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
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
const { useList: useMovieProductionHouses } = createMovieChildHooks<MovieProductionHouse>({
  table: 'movie_production_houses',
  keySuffix: 'movie-production-houses',
  select: '*, production_house:production_houses(*)',
});

export { useMovieProductionHouses };

// @sideeffect: inserts junction row; invalidates movie-production-houses cache on success
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
      const { error } = await supabase.from('movie_production_houses').insert({
        movie_id: movieId,
        production_house_id: productionHouseId,
      });
      if (error) throw error;
      return { movieId, productionHouseId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: ['admin', 'movie-production-houses', data.movieId],
      });
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}

// @sideeffect: deletes junction row by composite key (movie_id + production_house_id)
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
      const { error } = await supabase
        .from('movie_production_houses')
        .delete()
        .eq('movie_id', movieId)
        .eq('production_house_id', productionHouseId);
      if (error) throw error;
      return { movieId, productionHouseId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: ['admin', 'movie-production-houses', data.movieId],
      });
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}
