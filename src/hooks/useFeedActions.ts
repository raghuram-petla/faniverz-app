import { useCallback, useMemo } from 'react';
import { Share } from 'react-native';
import { useRouter } from 'expo-router';
import {
  useVoteFeedItem,
  useRemoveFeedVote,
  useFollowEntity,
  useUnfollowEntity,
} from '@/features/feed';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';

export interface UseFeedActionsParams {
  allItems: NewsFeedItem[];
  userVotes: Record<string, 'up' | 'down'>;
  setCommentSheetItemId: (id: string | null) => void;
}

export interface UseFeedActionsReturn {
  handleShare: (itemId: string) => void;
  handleEntityPress: (entityType: FeedEntityType, entityId: string) => void;
  handleFeedItemPress: (item: NewsFeedItem) => void;
  handleComment: (itemId: string) => void;
  gatedUpvote: (itemId: string) => void;
  gatedDownvote: (itemId: string) => void;
  gatedFollow: (entityType: FeedEntityType, entityId: string) => void;
  gatedUnfollow: (entityType: FeedEntityType, entityId: string) => void;
}

// @contract handles all user-initiated feed actions — voting, sharing, following, commenting, navigating
// @coupling depends on useVoteFeedItem, useRemoveFeedVote, useFollowEntity, useUnfollowEntity, useAuthGate, useAuth, useRouter
export function useFeedActions({
  allItems,
  userVotes,
  setCommentSheetItemId,
}: UseFeedActionsParams): UseFeedActionsReturn {
  const voteMutation = useVoteFeedItem(); // @sideeffect optimistic updates via TanStack Query cache
  const removeMutation = useRemoveFeedVote();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  const { gate } = useAuthGate(); // @boundary redirects guests to login
  const { user } = useAuth();
  const router = useRouter();

  const handleUpvote = useCallback(
    (itemId: string) => {
      const prev = userVotes[itemId] ?? null;
      if (prev === 'up') {
        removeMutation.mutate({ feedItemId: itemId, previousVote: prev });
      } else {
        voteMutation.mutate({ feedItemId: itemId, voteType: 'up', previousVote: prev });
      }
    },
    [userVotes, voteMutation, removeMutation],
  );

  const handleDownvote = useCallback(
    (itemId: string) => {
      const prev = userVotes[itemId] ?? null;
      if (prev === 'down') {
        removeMutation.mutate({ feedItemId: itemId, previousVote: prev });
      } else {
        voteMutation.mutate({ feedItemId: itemId, voteType: 'down', previousVote: prev });
      }
    },
    [userVotes, voteMutation, removeMutation],
  );

  const handleShare = useCallback(
    (itemId: string) => {
      const item = allItems.find((i) => i.id === itemId);
      /* istanbul ignore next */ if (!item) return;
      Share.share({ message: `${item.title} — Check it out on Faniverz!` }).catch(() => {});
    },
    [allItems],
  );

  const handleFollow = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      followMutation.mutate({ entityType, entityId });
    },
    [followMutation],
  );

  const handleUnfollow = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      unfollowMutation.mutate({ entityType, entityId });
    },
    [unfollowMutation],
  );

  const handleEntityPress = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      if (entityType === 'user') {
        if (entityId === user?.id) {
          router.push('/profile' as Parameters<typeof router.push>[0]);
        } else {
          router.push(`/user/${entityId}` as Parameters<typeof router.push>[0]);
        }
        return;
      }
      const routes: Record<string, string> = {
        movie: `/movie/${entityId}`,
        actor: `/actor/${entityId}`,
        production_house: `/production-house/${entityId}`,
      };
      router.push(routes[entityType] as Parameters<typeof router.push>[0]);
    },
    [router, user?.id],
  );

  const handleFeedItemPress = useCallback(
    (item: NewsFeedItem) => {
      router.push(`/post/${item.id}` as Parameters<typeof router.push>[0]);
    },
    [router],
  );

  const handleComment = useCallback(
    (itemId: string) => {
      setCommentSheetItemId(itemId);
    },
    [setCommentSheetItemId],
  );

  const gatedUpvote = useMemo(() => gate(handleUpvote), [gate, handleUpvote]);
  const gatedDownvote = useMemo(() => gate(handleDownvote), [gate, handleDownvote]);
  const gatedFollow = useMemo(() => gate(handleFollow), [gate, handleFollow]);
  const gatedUnfollow = useMemo(() => gate(handleUnfollow), [gate, handleUnfollow]);

  return {
    handleShare,
    handleEntityPress,
    handleFeedItemPress,
    handleComment,
    gatedUpvote,
    gatedDownvote,
    gatedFollow,
    gatedUnfollow,
  };
}
