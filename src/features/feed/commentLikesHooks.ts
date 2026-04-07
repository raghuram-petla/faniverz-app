import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { STALE_2M } from '@/constants/queryConfig';
import { likeComment, unlikeComment, fetchUserCommentLikes } from './commentLikesApi';
import { createOptimisticMutation } from './optimisticMutationFactory';
import type { FeedComment } from '@shared/types';

const COMMENT_LIKES_KEY = 'comment-likes-set';
const COMMENTS_KEY = 'feed-comments';
const REPLIES_KEY = 'comment-replies';

type LikesMap = Record<string, true>;
type CommentsCache = { pages: FeedComment[][]; pageParams: number[] };

// @edge: helper that adjusts like_count in both top-level comments cache AND replies caches.
// @coupling: called by both useLikeComment and useUnlikeComment. Not managed by the factory
// because it touches two distinct query keys with different data shapes in a single operation.
function incrementLikeCount(
  queryClient: ReturnType<typeof useQueryClient>,
  feedItemId: string,
  commentId: string,
  delta: number,
) {
  // Update in top-level comments cache
  queryClient.setQueryData<CommentsCache>([COMMENTS_KEY, feedItemId], (old) => {
    /* istanbul ignore next */ if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) =>
        page.map((c) =>
          c.id === commentId
            ? { ...c, like_count: Math.max(0, c.like_count + delta) }
            : /* istanbul ignore next */ c,
        ),
      ),
    };
  });
  // Update in any replies caches
  queryClient.setQueriesData<FeedComment[]>({ queryKey: [REPLIES_KEY] }, (old) => {
    /* istanbul ignore next */ if (!old) return old;
    return old.map((c) =>
      c.id === commentId
        ? { ...c, like_count: Math.max(0, c.like_count + delta) }
        : /* istanbul ignore next */ c,
    );
  });
}

// @sideeffect: optimistically increments like_count in comments/replies cache and adds to likes-set.
// DB trigger (trg_comment_like_count) mirrors the INCREMENT on INSERT.
// @coupling: uses createOptimisticMutation for the likes-set cancel/snapshot/update/rollback/invalidate
// lifecycle; incrementLikeCount handles the separate comment-count and reply caches directly.
export function useLikeComment(feedItemId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  type LikeVars = { commentId: string };

  const likesHandlers = createOptimisticMutation<LikeVars, LikesMap>(queryClient, {
    queryKeys: [COMMENT_LIKES_KEY] as const,
    primaryUpdater: (old, { commentId }) => ({
      ...(old ?? {}),
      [commentId]: true as const,
    }),
    onError: (_err, vars) => {
      // Rollback count change that was applied in onMutate
      incrementLikeCount(queryClient, feedItemId, vars.commentId, -1);
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToLikeComment'));
    },
  });

  return useMutation({
    mutationFn: ({ commentId }: LikeVars) => {
      if (!user?.id) throw new Error('Must be logged in');
      return likeComment(commentId, user.id);
    },
    onMutate: async (variables) => {
      const ctx = await likesHandlers.onMutate!(variables);
      // Increment like_count in comments/replies cache
      incrementLikeCount(queryClient, feedItemId, variables.commentId, 1);
      return ctx;
    },
    onError: likesHandlers.onError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENT_LIKES_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY, feedItemId] });
    },
  });
}

// @sideeffect: optimistically decrements like_count and removes from likes-set.
// @coupling: uses createOptimisticMutation for the likes-set lifecycle — see useLikeComment.
export function useUnlikeComment(feedItemId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  type LikeVars = { commentId: string };

  const likesHandlers = createOptimisticMutation<LikeVars, LikesMap>(queryClient, {
    queryKeys: [COMMENT_LIKES_KEY] as const,
    primaryUpdater: (old, { commentId }) => {
      if (!old) return {};
      const { [commentId]: _, ...rest } = old;
      return rest;
    },
    onError: (_err, vars) => {
      // Rollback count change that was applied in onMutate
      incrementLikeCount(queryClient, feedItemId, vars.commentId, 1);
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToLikeComment'));
    },
  });

  return useMutation({
    mutationFn: ({ commentId }: LikeVars) => {
      if (!user?.id) throw new Error('Must be logged in');
      return unlikeComment(commentId, user.id);
    },
    onMutate: async (variables) => {
      const ctx = await likesHandlers.onMutate!(variables);
      incrementLikeCount(queryClient, feedItemId, variables.commentId, -1);
      return ctx;
    },
    onError: likesHandlers.onError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENT_LIKES_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY, feedItemId] });
    },
  });
}

// @contract: returns Record<commentId, true> for liked comments. Query key uses sorted IDs.
export function useUserCommentLikes(commentIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;
  const idsKey = [...commentIds].sort().join(',');
  const sortedIds = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);

  return useQuery({
    queryKey: [COMMENT_LIKES_KEY, userId, sortedIds],
    queryFn: () => fetchUserCommentLikes(userId ?? /* istanbul ignore next */ '', sortedIds),
    enabled: !!userId && sortedIds.length > 0,
    staleTime: STALE_2M,
  });
}
