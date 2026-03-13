'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { FeedVote } from '@/lib/types';

export function useAdminFeedVotes(search = '') {
  return useQuery({
    queryKey: ['admin', 'feed-votes', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_votes')
        .select('*, profile:profiles(id, display_name, email), feed_item:news_feed(id, title)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      const votes = data as FeedVote[];

      if (search) {
        const lower = search.toLowerCase();
        return votes.filter(
          (v) =>
            v.profile?.display_name?.toLowerCase().includes(lower) ||
            v.feed_item?.title?.toLowerCase().includes(lower) ||
            v.vote_type.toLowerCase().includes(lower),
        );
      }

      return votes;
    },
    enabled: search.length >= 2 || search === '',
  });
}

export function useDeleteFeedVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feed_votes').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'feed-votes'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to delete vote');
    },
  });
}
