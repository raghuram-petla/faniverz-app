'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import { createSimpleMutation } from './createSimpleMutation';
import type { Review } from '@/lib/types';

// @boundary: joins reviews with movies and profiles via PostgREST foreign-key selects
// @contract: when search is provided, uses two-phase lookup:
//   1. search_reviews RPC returns matching review IDs (hybrid tsvector + pg_trgm on title/body)
//   2. final query fetches full rows + joins filtered to those IDs
//   movie.title and profile.display_name matching is handled client-side (PostgREST limitation for cross-table OR)
// @contract: returns max 200 reviews, newest first; query disabled for 1-char searches
export function useAdminReviews(search = '', ratingFilter = 0) {
  return useQuery({
    queryKey: ['admin', 'reviews', search, ratingFilter],
    queryFn: async () => {
      let matchIds: string[] | null = null;

      if (search) {
        // Phase 1: resolve review IDs via hybrid FTS + trigram search on title and body
        const { data: searchData, error: searchError } = await supabase.rpc('search_reviews', {
          search_term: search,
          result_limit: 200,
        });
        if (searchError) throw searchError;
        matchIds = (searchData ?? []).map((r: { id: string }) => r.id);
        if (matchIds!.length === 0) return [] as Review[];
      }

      // Phase 2: fetch full rows with joins; apply ID filter + rating filter
      let query = supabase
        .from('reviews')
        .select('*, movie:movies(id, title, poster_url), profile:profiles(id, display_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (ratingFilter > 0) query = query.eq('rating', ratingFilter);
      if (matchIds !== null) query = query.in('id', matchIds);

      const { data, error } = await query;
      if (error) throw error;
      const reviews = data as Review[];

      // Also match on joined movie title and profile display_name client-side
      // (PostgREST cannot OR across foreign table columns)
      // @edge: applied after the server-side ID filter to catch cross-table matches not in tsvector
      if (search) {
        const lower = search.toLowerCase();
        return reviews.filter(
          (r) =>
            r.title?.toLowerCase().includes(lower) ||
            r.body?.toLowerCase().includes(lower) ||
            r.movie?.title?.toLowerCase().includes(lower) ||
            r.profile?.display_name?.toLowerCase().includes(lower),
        );
      }

      return reviews;
    },
    enabled: search.length >= 2 || search === '',
  });
}

export interface UpdateReviewPayload {
  id: string;
  title?: string | null;
  body?: string | null;
  contains_spoiler?: boolean;
}

// @sideeffect: invalidates all ['admin', 'reviews'] queries on success; window.alert on error
// @nullable: title and body fields are optional — only provided fields are updated
export const useUpdateReview = createSimpleMutation<UpdateReviewPayload, string>({
  mutationFn: async ({ id, ...fields }) => {
    await crudFetch('PATCH', { table: 'reviews', id, data: fields });
    return id;
  },
  invalidateKeys: [['admin', 'reviews']],
  errorMessage: 'Failed to update review',
});

// @sideeffect: hard-deletes review row; no soft-delete or audit trail
// @sideeffect: invalidates dashboard — totalReviews count changes
export const useDeleteReview = createSimpleMutation<string, string>({
  mutationFn: async (id) => {
    await crudFetch('DELETE', { table: 'reviews', id });
    return id;
  },
  invalidateKeys: [
    ['admin', 'reviews'],
    ['admin', 'dashboard'],
  ],
  errorMessage: 'Failed to delete review',
});
