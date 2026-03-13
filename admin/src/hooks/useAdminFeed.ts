'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
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
// @boundary Bypasses createCrudHooks list — needs triple-sort (pinned, order, date) + movie JOIN
// @nullable filter param: omitted = all feed types returned
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
// @boundary Bypasses crud.useSingle — same movie JOIN as list query
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

// @sideeffect Toggles is_pinned flag via /api/admin-crud
export function useTogglePinFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      await crudFetch('PATCH', { table: 'news_feed', id, data: { is_pinned } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

export function useToggleFeatureFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      await crudFetch('PATCH', { table: 'news_feed', id, data: { is_featured } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

// @sideeffect Batch-updates display_order for all items via /api/admin-crud
// @edge If one update fails mid-batch, earlier updates persist — no transaction rollback
export function useReorderFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      await Promise.all(
        items.map(({ id, display_order }) =>
          crudFetch('PATCH', { table: 'news_feed', id, data: { display_order } }),
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}
