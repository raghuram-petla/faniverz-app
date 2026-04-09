import { useQuery } from '@tanstack/react-query';
import { STALE_5M, STALE_24H } from '@/constants/queryConfig';
import { supabase } from '@/lib/supabase';
import type { ProductionHouse } from '@/types';
import { fetchProductionHouseById, fetchProductionHouseMovies } from './api';

async function fetchProductionHouses(): Promise<ProductionHouse[]> {
  const { data, error } = await supabase.from('production_houses').select('*').order('name');
  if (error) throw error;
  return data as ProductionHouse[];
}

// @edge: Supabase's .in() translates to SQL IN clause, which has a practical limit (~32K params in Postgres).
// If productionHouseIds is very large, this could hit query size limits. Currently safe since production_houses
// table has ~dozen rows, but no guard exists if the dataset grows.
async function fetchMovieIdsByProductionHouse(productionHouseIds: string[]): Promise<string[]> {
  const { data, error } = await supabase
    .from('movie_production_houses')
    .select('movie_id')
    .in('production_house_id', productionHouseIds);
  if (error) throw error;
  // @contract: deduplicates movie_ids because a movie can be linked to multiple production houses in the junction table.
  // Callers depend on receiving unique IDs — if Set dedup is removed, downstream filters would show duplicate movie cards.
  return [...new Set((data ?? []).map((r) => r.movie_id))];
}

export function useProductionHouses() {
  return useQuery({
    queryKey: ['production_houses'],
    queryFn: fetchProductionHouses,
    staleTime: STALE_24H,
  });
}

export function useMovieIdsByProductionHouse(productionHouseIds: string[]) {
  return useQuery({
    queryKey: ['movie_ids_by_production_house', productionHouseIds],
    queryFn: () => fetchMovieIdsByProductionHouse(productionHouseIds),
    enabled: productionHouseIds.length > 0,
    staleTime: STALE_5M,
  });
}

export function useMoviesByProductionHouseIds(productionHouseIds: string[]) {
  const { data: movieIds = [] } = useMovieIdsByProductionHouse(productionHouseIds);
  return useQuery({
    queryKey: ['movies_by_ph_search', movieIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .in('id', movieIds)
        .order('release_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as import('@/types').Movie[];
    },
    enabled: movieIds.length > 0,
    staleTime: STALE_5M,
  });
}

export function useProductionHouseDetail(id: string) {
  // @coupling: fetches house and movies as two independent queries — no shared loading/error boundary.
  // If house fetch succeeds but movies fetch fails, isLoading stays true until movies also resolves (OR logic).
  // UI can show a stale/empty movie list while the house header renders fine, with no per-section error state.
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
      await Promise.allSettled([houseQuery.refetch(), moviesQuery.refetch()]);
    },
  };
}
