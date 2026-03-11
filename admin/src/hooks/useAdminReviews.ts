'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { Review } from '@/lib/types';

export function useAdminReviews() {
  return useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, movie:movies(id, title, poster_url), profile:profiles(id, display_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Review[];
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
  });
}
