'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import type { FeedComment } from '@/lib/types';

// @boundary: PostgREST .ilike() uses LIKE patterns — strip special chars to avoid syntax errors
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()"'\\%_]/g, '').trim();
}

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
      // @edge: use sanitized term for consistency with server-side ilike filter
      if (sanitized) {
        const lower = sanitized.toLowerCase();
        return comments.filter(
          (c) =>
            c.body?.toLowerCase().includes(lower) ||
            c.profile?.display_name?.toLowerCase().includes(lower),
        );
      }

      return comments;
    },
    enabled: search.length >= 2 || search === '',
  });
}

// @sideeffect: invalidates all ['admin', 'comments'] queries on success; window.alert on error
export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      await crudFetch('PATCH', { table: 'feed_comments', id, data: { body } });
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to update comment');
    },
  });
}

// @sideeffect: hard-deletes comment row from feed_comments; no soft-delete
export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await crudFetch('DELETE', { table: 'feed_comments', id });
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to delete comment');
    },
  });
}
