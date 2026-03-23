'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import { createSimpleMutation } from './createSimpleMutation';
import type { FeedComment } from '@/lib/types';
import { sanitizeSearchTerm } from '@/lib/sanitizeSearchTerm';

// @boundary: joins feed_comments with news_feed and profiles via PostgREST foreign-key selects
// @edge: search filters body via ilike server-side, but profile.display_name is matched client-side
//        because PostgREST cannot OR across foreign table columns
// @contract: returns max 200 comments, newest first; query disabled for 1-char searches
export function useAdminComments(search = '') {
  return useQuery({
    queryKey: ['admin', 'comments', search],
    queryFn: async () => {
      const sanitized = sanitizeSearchTerm(search);
      let query = supabase
        .from('feed_comments')
        .select('*, feed_item:news_feed(id, title), profile:profiles(id, display_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (sanitized) {
        query = query.ilike('body', `%${sanitized}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const comments = data as FeedComment[];

      // Also match on profile display_name client-side
      // (PostgREST cannot OR across foreign table columns)
      // @edge: body already filtered server-side via ilike — only display_name needs client-side check
      if (sanitized) {
        const lower = sanitized.toLowerCase();
        return comments.filter(
          (c) =>
            c.profile?.display_name?.toLowerCase().includes(lower) ||
            c.body?.toLowerCase().includes(lower),
        );
      }

      return comments;
    },
    enabled: search.length >= 2 || search === '',
  });
}

// @sideeffect: invalidates all ['admin', 'comments'] queries on success; window.alert on error
export const useUpdateComment = createSimpleMutation<{ id: string; body: string }, string>({
  mutationFn: async ({ id, body }) => {
    await crudFetch('PATCH', { table: 'feed_comments', id, data: { body } });
    return id;
  },
  invalidateKeys: [['admin', 'comments']],
  errorMessage: 'Failed to update comment',
});

// @sideeffect: hard-deletes comment row from feed_comments; no soft-delete
// @sideeffect: invalidates dashboard — totalComments count changes
export const useDeleteComment = createSimpleMutation<string, string>({
  mutationFn: async (id) => {
    await crudFetch('DELETE', { table: 'feed_comments', id });
    return id;
  },
  invalidateKeys: [
    ['admin', 'comments'],
    ['admin', 'dashboard'],
  ],
  errorMessage: 'Failed to delete comment',
});
