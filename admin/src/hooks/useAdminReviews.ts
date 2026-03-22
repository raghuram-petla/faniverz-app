'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import type { Review } from '@/lib/types';

// @boundary: PostgREST .or() filter uses commas as delimiters — strip special chars to avoid syntax errors
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()"'\\]/g, '').trim();
}

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

      if (search) {
        const term = sanitizeSearchTerm(search);
        if (term) {
          query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      const reviews = data as Review[];

      // Also match on joined movie title and profile display_name client-side
      // (PostgREST cannot OR across foreign table columns in a single .or())
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
export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: UpdateReviewPayload) => {
      await crudFetch('PATCH', { table: 'reviews', id, data: fields });
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to update review');
    },
  });
}

// @sideeffect: hard-deletes review row; no soft-delete or audit trail
export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await crudFetch('DELETE', { table: 'reviews', id });
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to delete review');
    },
  });
}
