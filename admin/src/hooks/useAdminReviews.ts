'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import { createSimpleMutation } from './createSimpleMutation';
import type { Review } from '@/lib/types';
import { sanitizeSearchTerm } from '@/lib/sanitizeSearchTerm';

// @boundary: joins reviews with movies and profiles via PostgREST foreign-key selects
// @edge: search matches title/body server-side via .or(), but movie.title and profile.display_name
//        are filtered client-side because PostgREST cannot OR across foreign table columns
// @contract: returns max 200 reviews, newest first; query disabled for 1-char searches
export function useAdminReviews(search = '', ratingFilter = 0) {
  return useQuery({
    queryKey: ['admin', 'reviews', search, ratingFilter],
    queryFn: async () => {
      let query = supabase
        .from('reviews')
        .select('*, movie:movies(id, title, poster_url), profile:profiles(id, display_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (ratingFilter > 0) {
        query = query.eq('rating', ratingFilter);
      }

      const sanitized = search ? sanitizeSearchTerm(search) : '';

      if (sanitized) {
        query = query.or(`title.ilike.%${sanitized}%,body.ilike.%${sanitized}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const reviews = data as Review[];

      // Also match on joined movie title and profile display_name client-side
      // (PostgREST cannot OR across foreign table columns in a single .or())
      // @edge: reuse sanitized term for consistency with server-side .or() filter
      if (sanitized) {
        const lower = sanitized.toLowerCase();
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
