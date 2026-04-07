import { useMutation, useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { COMMENTS_PAGINATION } from '@/constants/paginationConfig';
import { STALE_2M } from '@/constants/queryConfig';
import { fetchComments, fetchReplies, addComment, deleteComment } from './commentsApi';
import type { FeedComment } from '@shared/types';
import type { NewsFeedItem } from '@shared/types';

const COMMENTS_KEY = 'feed-comments';
const REPLIES_KEY = 'comment-replies';
const FEED_KEYS = ['news-feed', 'personalized-feed'] as const;

type CommentsCache = { pages: FeedComment[][]; pageParams: number[] };
type FeedPages = { pages: NewsFeedItem[][] };

// @sideeffect: Optimistically adjusts comment_count in all feed caches for a given feedItemId.
// This prevents a race condition in production where invalidateQueries refetches before the
// DB trigger (trg_feed_comment_count) has committed the updated count.
function adjustFeedCommentCount(queryClient: QueryClient, feedItemId: string, delta: number) {
  for (const key of FEED_KEYS) {
    queryClient.setQueriesData<FeedPages>({ queryKey: [key] }, (old) => {
      /* istanbul ignore next -- setQueriesData only calls callback for entries with data; old is never falsy here */
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) =>
          page.map((item) =>
            item.id === feedItemId
              ? { ...item, comment_count: Math.max(0, item.comment_count + delta) }
              : item,
          ),
        ),
      };
    });
  }
  // @sideeffect: Also update the single feed-item cache (post detail screen)
  queryClient.setQueryData<NewsFeedItem>(['feed-item', feedItemId], (old) =>
    old ? { ...old, comment_count: Math.max(0, old.comment_count + delta) } : old,
  );
}

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
        // Top-level: prepend to first page so new comments appear at the top (newest-first order)
        queryClient.setQueryData<CommentsCache>([COMMENTS_KEY, feedItemId], (old) => {
          if (!old) return { pages: [[newComment]], pageParams: [0] };
          const pages = [...old.pages];
          if (pages.length === 0) {
            pages.push([newComment]);
          } else {
            pages[0] = [newComment, ...pages[0]];
          }
          return { ...old, pages };
        });
      }
      // @sideeffect: Optimistically update comment_count in feed caches immediately, then
      // invalidate so the authoritative server count overwrites once the DB trigger has committed.
      // Only increment for top-level comments — replies don't affect comment_count.
      if (!parentCommentId) {
        adjustFeedCommentCount(queryClient, feedItemId, 1);
      }
      queryClient.invalidateQueries({ queryKey: ['news-feed'] });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
      queryClient.invalidateQueries({ queryKey: ['feed-item', feedItemId] });
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
      // @sideeffect: Optimistically decrement comment_count for top-level deletes, then invalidate.
      if (!parentCommentId) {
        adjustFeedCommentCount(queryClient, feedItemId, -1);
      }
      queryClient.invalidateQueries({ queryKey: ['news-feed'] });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
      queryClient.invalidateQueries({ queryKey: ['feed-item', feedItemId] });
    },
  });
}
