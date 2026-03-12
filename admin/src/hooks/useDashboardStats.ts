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

        if (movieIds.length === 0) {
          return {
            totalMovies: 0,
            totalActors: 0,
            totalUsers: 0,
            totalReviews: 0,
            totalFeedItems: 0,
            totalWatchlistEntries: 0,
            totalFollows: 0,
            totalComments: 0,
          };
        }

        // Get feed item IDs for these movies to count comments
        const { data: feedItemData } = await supabase
          .from('news_feed')
          .select('id')
          .in('movie_id', movieIds);
        const feedItemIds = (feedItemData ?? []).map((f) => f.id);

        const [castData, reviews, feedItems, watchlist, follows, comments] = await Promise.all([
          supabase.from('movie_cast').select('actor_id').in('movie_id', movieIds),
          supabase
            .from('reviews')
            .select('id', { count: 'estimated', head: true })
            .in('movie_id', movieIds),
          supabase
            .from('news_feed')
            .select('id', { count: 'estimated', head: true })
            .in('movie_id', movieIds),
          supabase
            .from('watchlists')
            .select('id', { count: 'estimated', head: true })
            .in('movie_id', movieIds),
          supabase
            .from('entity_follows')
            .select('id', { count: 'estimated', head: true })
            .eq('entity_type', 'movie')
            .in('entity_id', movieIds),
          feedItemIds.length > 0
            ? supabase
                .from('feed_comments')
                .select('id', { count: 'estimated', head: true })
                .in('feed_item_id', feedItemIds)
            : Promise.resolve({ count: 0 }),
        ]);

        const uniqueActorIds = new Set((castData.data ?? []).map((r) => r.actor_id));

        return {
          totalMovies: movieIds.length,
          totalActors: uniqueActorIds.size,
          totalUsers: 0, // PH admins don't have access to total user count
          totalReviews: reviews.count ?? 0,
          totalFeedItems: feedItems.count ?? 0,
          totalWatchlistEntries: watchlist.count ?? 0,
          totalFollows: follows.count ?? 0,
          totalComments: comments.count ?? 0,
        };
      }

      const [movies, actors, users, reviews, feedItems, watchlist, follows, comments] =
        await Promise.all([
          supabase.from('movies').select('id', { count: 'estimated', head: true }),
          supabase.from('actors').select('id', { count: 'estimated', head: true }),
          supabase.from('profiles').select('id', { count: 'estimated', head: true }),
          supabase.from('reviews').select('id', { count: 'estimated', head: true }),
          supabase.from('news_feed').select('id', { count: 'estimated', head: true }),
          supabase.from('watchlists').select('id', { count: 'estimated', head: true }),
          supabase.from('entity_follows').select('id', { count: 'estimated', head: true }),
          supabase.from('feed_comments').select('id', { count: 'estimated', head: true }),
        ]);

      return {
        totalMovies: movies.count ?? 0,
        totalActors: actors.count ?? 0,
        totalUsers: users.count ?? 0,
        totalReviews: reviews.count ?? 0,
        totalFeedItems: feedItems.count ?? 0,
        totalWatchlistEntries: watchlist.count ?? 0,
        totalFollows: follows.count ?? 0,
        totalComments: comments.count ?? 0,
      };
    },
    staleTime: 5 * 60_000,
  });
}
