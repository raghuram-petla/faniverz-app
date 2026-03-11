import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProductionHouse } from '@/types';
import { fetchProductionHouseById, fetchProductionHouseMovies } from './api';

async function fetchProductionHouses(): Promise<ProductionHouse[]> {
  const { data, error } = await supabase.from('production_houses').select('*').order('name');
  if (error) throw error;
  return data as ProductionHouse[];
}

async function fetchMovieIdsByProductionHouse(productionHouseIds: string[]): Promise<string[]> {
  const { data, error } = await supabase
    .from('movie_production_houses')
    .select('movie_id')
    .in('production_house_id', productionHouseIds);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.movie_id))];
}

export function useProductionHouses() {
  return useQuery({
    queryKey: ['production_houses'],
    queryFn: fetchProductionHouses,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useMovieIdsByProductionHouse(productionHouseIds: string[]) {
  return useQuery({
    queryKey: ['movie_ids_by_production_house', productionHouseIds],
    queryFn: () => fetchMovieIdsByProductionHouse(productionHouseIds),
    enabled: productionHouseIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductionHouseDetail(id: string) {
  const houseQuery = useQuery({
    queryKey: ['production_house', id],
    queryFn: () => fetchProductionHouseById(id),
    enabled: !!id,
  });

  const moviesQuery = useQuery({
    queryKey: ['production_house_movies', id],
    queryFn: () => fetchProductionHouseMovies(id),
    enabled: !!id,
  });

  return {
    house: houseQuery.data ?? null,
    movies: moviesQuery.data ?? [],
    isLoading: houseQuery.isLoading || moviesQuery.isLoading,
    refetch: async () => {
      await Promise.all([houseQuery.refetch(), moviesQuery.refetch()]);
    },
  };
}
