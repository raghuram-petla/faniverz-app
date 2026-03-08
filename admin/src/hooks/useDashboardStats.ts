'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { DashboardStats } from '@/lib/types';

/**
 * Fetch dashboard stats, optionally scoped to production house movies.
 * PH admins only see stats for their production house's movies.
 */
export function useDashboardStats(productionHouseIds?: string[]) {
  const hasPHScope = productionHouseIds && productionHouseIds.length > 0;

  return useQuery({
    queryKey: ['admin', 'dashboard', productionHouseIds],
    queryFn: async (): Promise<DashboardStats> => {
      if (hasPHScope) {
        const { data: junctionData, error: jErr } = await supabase
          .from('movie_production_houses')
          .select('movie_id')
          .in('production_house_id', productionHouseIds);
        if (jErr) throw jErr;

        const movieIds = [...new Set((junctionData ?? []).map((r) => r.movie_id))];
        return { totalMovies: movieIds.length };
      }

      // Use estimated count to avoid full table scan (reads pg_class.reltuples)
      const { count } = await supabase
        .from('movies')
        .select('id', { count: 'estimated', head: true });

      return { totalMovies: count ?? 0 };
    },
    staleTime: 5 * 60_000,
  });
}
