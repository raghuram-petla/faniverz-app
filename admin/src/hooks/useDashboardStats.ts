'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { DashboardStats } from '@/lib/types';
import { ADMIN_STALE_5M } from '@/lib/query-config';

/**
 * Fetch dashboard stats, optionally scoped to production house movies.
 * PH admins only see stats for their production house's movies.
 */
// @nullable: productionHouseIds — omit for super-admin (all stats); provide for PH-scoped stats
// @contract: PH admins get totalUsers=0 because user count is not scoped to production houses
// @boundary: uses estimated counts (head:true) for performance; not exact row counts
export function useDashboardStats(productionHouseIds?: string[]) {
  const hasPHScope = productionHouseIds && productionHouseIds.length > 0;

  return useQuery({
    queryKey: ['admin', 'dashboard', productionHouseIds],
    queryFn: async (): Promise<DashboardStats> => {
      // @edge: PH-scoped branch — requires junction table lookup first
      if (hasPHScope) {
        const { data: junctionData, error: jErr } = await supabase
          .from('movie_production_houses')
          .select('movie_id')
          .in('production_house_id', productionHouseIds);
        if (jErr) throw jErr;

        const movieIds = [...new Set((junctionData ?? []).map((r) => r.movie_id))];

        // @edge: PH has no movies — return zeroes early to avoid empty .in() queries
        if (movieIds.length === 0) {
          return {
            totalMovies: 0,
            totalActors: 0,
            totalUsers: 0,
            totalReviews: 0,
            totalFeedItems: 0,
            totalComments: 0,
          };
        }

        // Get feed item IDs for these movies to count comments
        const { data: feedItemData } = await supabase
          .from('news_feed')
          .select('id')
          .in('movie_id', movieIds);
        const feedItemIds = (feedItemData ?? []).map((f) => f.id);

        const [castData, reviews, feedItems, comments] = await Promise.all([
          supabase.from('movie_cast').select('actor_id').in('movie_id', movieIds),
          supabase
            .from('reviews')
            .select('id', { count: 'estimated', head: true })
            .in('movie_id', movieIds),
          supabase
            .from('news_feed')
            .select('id', { count: 'estimated', head: true })
            .in('movie_id', movieIds),
          feedItemIds.length > 0
            ? supabase
                .from('feed_comments')
                .select('id', { count: 'estimated', head: true })
                .in('feed_item_id', feedItemIds)
            : Promise.resolve({ count: 0 }),
        ]);

        // @assumes: an actor may appear in multiple movies; Set deduplication gives unique count
        const uniqueActorIds = new Set((castData.data ?? []).map((r) => r.actor_id));

        return {
          totalMovies: movieIds.length,
          totalActors: uniqueActorIds.size,
          totalUsers: 0, // PH admins don't have access to total user count
          totalReviews: reviews.count ?? 0,
          totalFeedItems: feedItems.count ?? 0,
          /* v8 ignore start */
          totalComments: comments.count ?? 0,
          /* v8 ignore stop */
        };
      }

      // @sync: all 6 count queries fire in parallel for faster dashboard load
      const [movies, actors, users, reviews, feedItems, comments] = await Promise.all([
        supabase.from('movies').select('id', { count: 'estimated', head: true }),
        supabase.from('actors').select('id', { count: 'estimated', head: true }),
        supabase.from('profiles').select('id', { count: 'estimated', head: true }),
        supabase.from('reviews').select('id', { count: 'estimated', head: true }),
        supabase.from('news_feed').select('id', { count: 'estimated', head: true }),
        supabase.from('feed_comments').select('id', { count: 'estimated', head: true }),
      ]);

      return {
        totalMovies: movies.count ?? 0,
        totalActors: actors.count ?? 0,
        totalUsers: users.count ?? 0,
        totalReviews: reviews.count ?? 0,
        totalFeedItems: feedItems.count ?? 0,
        totalComments: comments.count ?? 0,
      };
    },
    staleTime: ADMIN_STALE_5M,
  });
}
