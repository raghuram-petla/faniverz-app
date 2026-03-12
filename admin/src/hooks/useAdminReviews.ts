'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { Review } from '@/lib/types';

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
        query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
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

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: UpdateReviewPayload) => {
      const { error } = await supabase.from('reviews').update(fields).eq('id', id);
      if (error) throw error;
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

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
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
