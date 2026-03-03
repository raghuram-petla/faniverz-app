'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { logAudit } from '@/lib/audit-client';
import type { ProductionHouse } from '@/lib/types';

interface MovieProductionHouse {
  movie_id: string;
  production_house_id: string;
  production_house: ProductionHouse;
}

export function useMovieProductionHouses(movieId: string) {
  return useQuery({
    queryKey: ['admin', 'movie-production-houses', movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_production_houses')
        .select('*, production_house:production_houses(*)')
        .eq('movie_id', movieId);
      if (error) throw error;
      return (data ?? []) as MovieProductionHouse[];
    },
    enabled: !!movieId,
  });
}

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
      logAudit('create', 'movie_production_house', data.productionHouseId, {
        movie_id: data.movieId,
      });
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
      logAudit('delete', 'movie_production_house', data.productionHouseId, {
        movie_id: data.movieId,
      });
    },
  });
}
