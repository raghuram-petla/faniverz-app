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
      lastPage.length < PAGE_SIZE ? undefined : (lastPageParam as number) + 1,
    enabled: !!feedItemId,
  });
}

// @sideeffect: addComment fires trg_feed_comment_count trigger. Invalidates feed caches for comment_count refresh.
// @edge: onSuccess appends newComment to the LAST page of the infinite query.
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
      // @sideeffect: invalidate feed caches so comment_count refreshes on feed cards
      queryClient.invalidateQueries({ queryKey: ['news-feed'] });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToAddComment'));
    },
  });
}

// @contract: deleteComment filters by BOTH id AND user_id. Invalidates feed caches for comment_count refresh.
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
      // @sideeffect: invalidate feed caches so comment_count refreshes on feed cards
      queryClient.invalidateQueries({ queryKey: ['news-feed'] });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToDeleteComment'));
    },
  });
}
