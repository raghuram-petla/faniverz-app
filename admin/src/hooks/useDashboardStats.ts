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
        return {
          totalMovies: movieIds.length,
          totalActors: 0,
          totalUsers: 0,
          totalReviews: 0,
          totalFeedItems: 0,
          totalWatchlistEntries: 0,
          totalFollows: 0,
        };
      }

      const [movies, actors, users, reviews, feedItems, watchlist, follows] = await Promise.all([
        supabase.from('movies').select('id', { count: 'estimated', head: true }),
        supabase.from('actors').select('id', { count: 'estimated', head: true }),
        supabase.from('profiles').select('id', { count: 'estimated', head: true }),
        supabase.from('reviews').select('id', { count: 'estimated', head: true }),
        supabase.from('news_feed').select('id', { count: 'estimated', head: true }),
        supabase.from('watchlists').select('id', { count: 'estimated', head: true }),
        supabase.from('entity_follows').select('id', { count: 'estimated', head: true }),
      ]);

      return {
        totalMovies: movies.count ?? 0,
        totalActors: actors.count ?? 0,
        totalUsers: users.count ?? 0,
        totalReviews: reviews.count ?? 0,
        totalFeedItems: feedItems.count ?? 0,
        totalWatchlistEntries: watchlist.count ?? 0,
        totalFollows: follows.count ?? 0,
      };
    },
    staleTime: 5 * 60_000,
  });
}
