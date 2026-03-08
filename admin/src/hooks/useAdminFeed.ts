'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createCrudHooks } from '@/hooks/createCrudHooks';
import type { NewsFeedItem, FeedType } from '@/lib/types';

const QUERY_KEY = ['admin', 'news-feed'];

const crud = createCrudHooks<NewsFeedItem>({
  table: 'news_feed',
  queryKeyBase: 'news-feed',
  orderBy: 'published_at',
  orderAscending: false,
  paginated: false,
});

// Custom list: multi-column ordering + JOIN + feed_type filter
export function useAdminFeed(filter?: FeedType) {
  return useQuery({
    queryKey: [...QUERY_KEY, filter],
    queryFn: async () => {
      let query = supabase
        .from('news_feed')
        .select('*, movie:movies!news_feed_movie_id_fkey(id, title, poster_url)')
        .order('is_pinned', { ascending: false })
        .order('display_order')
        .order('published_at', { ascending: false })
        .limit(500);

      if (filter) {
        query = query.eq('feed_type', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as NewsFeedItem[]) ?? [];
    },
  });
}

// Custom single: needs JOIN
export function useAdminFeedItem(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_feed')
        .select('*, movie:movies!news_feed_movie_id_fkey(id, title, poster_url)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as NewsFeedItem;
    },
    enabled: !!id,
  });
}

export const useCreateFeedItem = crud.useCreate;
export const useUpdateFeedItem = crud.useUpdate;
export const useDeleteFeedItem = crud.useDelete;

export function useTogglePinFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase.from('news_feed').update({ is_pinned }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useToggleFeatureFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from('news_feed').update({ is_featured }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useReorderFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      const updates = items.map(({ id, display_order }) =>
        supabase.from('news_feed').update({ display_order }).eq('id', id),
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
