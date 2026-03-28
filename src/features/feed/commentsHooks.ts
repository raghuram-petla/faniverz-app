import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { COMMENTS_PAGINATION } from '@/constants/paginationConfig';
import { fetchComments, addComment, deleteComment } from './commentsApi';
import type { FeedComment } from '@shared/types';

const COMMENTS_KEY = 'feed-comments';

// @contract: Uses smart pagination — loads 5 comments initially, background-expands to 20 more.
export function useComments(feedItemId: string) {
  return useSmartInfiniteQuery<FeedComment>({
    queryKey: [COMMENTS_KEY, feedItemId],
    queryFn: (offset, limit) => fetchComments(feedItemId, offset, limit),
    config: COMMENTS_PAGINATION,
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
