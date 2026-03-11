'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { FeedComment } from '@/lib/types';

export function useAdminComments() {
  return useQuery({
    queryKey: ['admin', 'comments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_comments')
        .select('*, feed_item:news_feed(id, title), profile:profiles(id, display_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as FeedComment[];
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feed_comments').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
  });
}
