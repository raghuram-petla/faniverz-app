import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { COMMENTS_PAGINATION } from '@/constants/paginationConfig';
import { STALE_2M } from '@/constants/queryConfig';
import { fetchComments, fetchReplies, addComment, deleteComment } from './commentsApi';
import type { FeedComment } from '@shared/types';

const COMMENTS_KEY = 'feed-comments';
const REPLIES_KEY = 'comment-replies';

type CommentsCache = { pages: FeedComment[][]; pageParams: number[] };

// @contract: Uses smart pagination — loads top-level comments only (parent_comment_id IS NULL).
export function useComments(feedItemId: string) {
  return useSmartInfiniteQuery<FeedComment>({
    queryKey: [COMMENTS_KEY, feedItemId],
    queryFn: (offset, limit) => fetchComments(feedItemId, offset, limit),
    config: COMMENTS_PAGINATION,
    enabled: !!feedItemId,
  });
}

// @contract: Fetches all replies for a parent comment on demand (no pagination).
export function useReplies(parentCommentId: string) {
  return useQuery({
    queryKey: [REPLIES_KEY, parentCommentId],
    queryFn: () => fetchReplies(parentCommentId),
    enabled: !!parentCommentId,
    staleTime: STALE_2M,
  });
}

// @sideeffect: addComment fires trg_feed_comment_count. If parentCommentId set, also fires
// trg_comment_reply_count and trg_notify_comment_reply.
// @edge: onSuccess appends to comments cache (top-level) or invalidates replies cache (reply).
// @edge: no onError handler — if the insert fails (e.g., RLS violation, network error), the mutation throws but no Alert is shown. The comment simply doesn't appear. Compare with useLikeComment which shows an Alert on error.
export function useAddComment(feedItemId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ body, parentCommentId }: { body: string; parentCommentId?: string }) => {
      if (!user) throw new Error('Not authenticated');
      return addComment(feedItemId, user.id, body, parentCommentId);
    },
    onSuccess: (newComment, { parentCommentId }) => {
      if (parentCommentId) {
        // Reply: invalidate replies cache for the parent, increment parent's reply_count
        queryClient.invalidateQueries({ queryKey: [REPLIES_KEY, parentCommentId] });
        queryClient.setQueryData<CommentsCache>([COMMENTS_KEY, feedItemId], (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((c) =>
                c.id === parentCommentId ? { ...c, reply_count: c.reply_count + 1 } : c,
              ),
            ),
          };
        });
      } else {
        // Top-level: append to last page
        queryClient.setQueryData<CommentsCache>([COMMENTS_KEY, feedItemId], (old) => {
          if (!old) return { pages: [[newComment]], pageParams: [0] };
          const pages = [...old.pages];
          if (pages.length === 0) {
            pages.push([newComment]);
          } else {
            pages[pages.length - 1] = [...pages[pages.length - 1], newComment];
          }
          return { ...old, pages };
        });
      }
      // @sideeffect: invalidate feed caches so comment_count refreshes on feed cards
      queryClient.invalidateQueries({ queryKey: ['news-feed'] });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
    },
  });
}

// @contract: deleteComment filters by BOTH id AND user_id.
// @sideeffect: If deleting a reply, invalidates replies cache and decrements parent's reply_count.
// If deleting a top-level comment, removes from comments cache (CASCADE handles its replies).
// @edge: no optimistic rollback on error — if the delete API fails, the comment is already removed from cache. The onSettled invalidation (absent here) would normally self-heal, but this mutation has no onSettled. The only recovery path is manual pull-to-refresh by the user.
export function useDeleteComment(feedItemId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ commentId }: { commentId: string; parentCommentId?: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      return deleteComment(commentId, user.id);
    },
    onSuccess: (_data, { commentId, parentCommentId }) => {
      if (parentCommentId) {
        // Deleting a reply: remove from replies cache, decrement parent's reply_count
        queryClient.setQueryData<FeedComment[]>([REPLIES_KEY, parentCommentId], (old) =>
          old ? old.filter((c) => c.id !== commentId) : old,
        );
        queryClient.setQueryData<CommentsCache>([COMMENTS_KEY, feedItemId], (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((c) =>
                c.id === parentCommentId
                  ? { ...c, reply_count: Math.max(0, c.reply_count - 1) }
                  : c,
              ),
            ),
          };
        });
      } else {
        // Deleting a top-level comment: remove from comments cache + clear stale replies cache
        queryClient.setQueryData<CommentsCache>([COMMENTS_KEY, feedItemId], (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => page.filter((c) => c.id !== commentId)),
          };
        });
        // @sideeffect: CASCADE deletes replies in DB; remove stale client-side replies cache
        queryClient.removeQueries({ queryKey: [REPLIES_KEY, commentId] });
      }
      queryClient.invalidateQueries({ queryKey: ['news-feed'] });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
    },
  });
}
