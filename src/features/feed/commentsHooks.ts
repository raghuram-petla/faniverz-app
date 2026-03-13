import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { fetchComments, addComment, deleteComment } from './commentsApi';
import type { FeedComment } from '@shared/types';

const COMMENTS_KEY = 'feed-comments';
const PAGE_SIZE = 20;

// @coupling: PAGE_SIZE (20) here must match the getNextPageParam check `lastPage.length === PAGE_SIZE`. If fetchComments in commentsApi.ts returns fewer than 20 due to a different default pageSize, infinite scroll stops after the first page even if more comments exist.
export function useComments(feedItemId: string) {
  return useInfiniteQuery({
    queryKey: [COMMENTS_KEY, feedItemId],
    queryFn: ({ pageParam = 0 }) => fetchComments(feedItemId, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? (lastPageParam as number) + 1 : undefined,
    enabled: !!feedItemId,
  });
}

// @sideeffect: addComment inserts into feed_comments which fires the trg_feed_comment_count trigger, incrementing news_feed.comment_count. But this hook does NOT invalidate the feed caches (['news-feed'] or ['personalized-feed']). The comment_count shown on feed cards stays stale until the user scrolls away and the feed's staleTime (5min) expires. The comment is only appended to the local comments cache.
// @edge: onSuccess appends newComment to the LAST page of the infinite query. If the user hasn't loaded all pages, the new comment appears at the bottom of the loaded list, which may be the wrong chronological position (comments are sorted ascending by created_at, so new comment belongs at the end — this is correct). But if there are unloaded pages in between, the count will seem off.
// @coupling: addComment in commentsApi.ts selects 'profile:profiles(display_name)' — the returned FeedComment has a nested profile. If the profiles join fails (e.g., profile deleted), the comment is inserted but the select fails, causing onError to fire and showing an error alert even though the comment was actually saved.
export function useAddComment(feedItemId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (body: string) => {
      if (!user) throw new Error('Not authenticated');
      return addComment(feedItemId, user.id, body);
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData<{ pages: FeedComment[][]; pageParams: number[] }>(
        [COMMENTS_KEY, feedItemId],
        (old) => {
          if (!old) return { pages: [[newComment]], pageParams: [0] };
          const pages = [...old.pages];
          if (pages.length === 0) {
            pages.push([newComment]);
          } else {
            pages[pages.length - 1] = [...pages[pages.length - 1], newComment];
          }
          return { ...old, pages };
        },
      );
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToAddComment'));
    },
  });
}

// @contract: deleteComment filters by BOTH id AND user_id — RLS also enforces auth.uid() = user_id. This double-check means even if a malicious caller passes someone else's commentId, the delete is a no-op (0 rows affected). But a no-op delete returns success, so the onSuccess handler removes the comment from cache even if the server didn't actually delete it. If an admin needs to delete comments, they can't use this endpoint.
// @edge: onSuccess removes the comment from cache immediately, but the trg_feed_comment_count trigger decrements news_feed.comment_count on the server side. Like useAddComment, this hook does NOT invalidate the feed caches, so the comment_count on feed cards stays stale.
export function useDeleteComment(feedItemId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (commentId: string) => {
      if (!user) throw new Error('Not authenticated');
      return deleteComment(commentId, user.id);
    },
    onSuccess: (_data, commentId) => {
      queryClient.setQueryData<{ pages: FeedComment[][]; pageParams: number[] }>(
        [COMMENTS_KEY, feedItemId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => page.filter((c) => c.id !== commentId)),
          };
        },
      );
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToDeleteComment'));
    },
  });
}
