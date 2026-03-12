'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createMovieChildHooks } from './createMovieChildHooks';
import type { ProductionHouse } from '@/lib/types';

export interface MovieProductionHouse {
  movie_id: string;
  production_house_id: string;
  production_house: ProductionHouse;
}

const { useList: useMovieProductionHouses } = createMovieChildHooks<MovieProductionHouse>({
  table: 'movie_production_houses',
  keySuffix: 'movie-production-houses',
  select: '*, production_house:production_houses(*)',
});

export { useMovieProductionHouses };

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
