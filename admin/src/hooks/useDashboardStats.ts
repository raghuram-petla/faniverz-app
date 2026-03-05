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
        // PH admin: scoped stats
        const { data: junctionData, error: jErr } = await supabase
          .from('movie_production_houses')
          .select('movie_id')
          .in('production_house_id', productionHouseIds);
        if (jErr) throw jErr;

        const movieIds = [...new Set((junctionData ?? []).map((r) => r.movie_id))];

        let reviewsCount = 0;
        if (movieIds.length > 0) {
          const { count } = await supabase
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .in('movie_id', movieIds)
            .gte('created_at', new Date().toISOString().split('T')[0]);
          reviewsCount = count ?? 0;
        }

        return {
          totalMovies: movieIds.length,
          totalUsers: 0,
          reviewsToday: reviewsCount,
          activeNotifications: 0,
        };
      }

      // Regular admin / super admin: full stats
      const [moviesRes, usersRes, reviewsRes, notifsRes] = await Promise.all([
        supabase.from('movies').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0]),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);
      return {
        totalMovies: moviesRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        reviewsToday: reviewsRes.count ?? 0,
        activeNotifications: notifsRes.count ?? 0,
      };
    },
    staleTime: 60_000,
  });
}
