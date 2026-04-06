import { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import {
  useFeedItem,
  useComments,
  useAddComment,
  useDeleteComment,
  useVoteFeedItem,
  useRemoveFeedVote,
  useUserVotes,
  useBookmarkFeedItem,
  useUnbookmarkFeedItem,
  useUserBookmarks,
  useUserCommentLikes,
  useLikeComment,
  useUnlikeComment,
} from '@/features/feed';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useAuthGate } from '@/hooks/useAuthGate';
import { FeedCard } from '@/components/feed/FeedCard';
import { CommentsList } from '@/components/feed/CommentsList';
import { CommentInput, type ReplyTarget } from '@/components/feed/CommentInput';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useRecordPostView } from '@/hooks/useRecordPostView';
import { createPostDetailStyles } from '@/styles/postDetail.styles';
import { PostContentSkeleton } from '@/components/feed/PostContentSkeleton';
import type { NewsFeedItem, FeedEntityType, FeedComment } from '@shared/types';

// @boundary: Post detail — single feed item with comments, voting, likes, and reply input
export default function PostDetailScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createPostDetailStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const userId = user?.id ?? null;

  const { data: post, isLoading: feedLoading, refetch } = useFeedItem(id ?? '');
  useRecordPostView(post);
  const voteMutation = useVoteFeedItem();
  const removeMutation = useRemoveFeedVote();
  const bookmarkMutation = useBookmarkFeedItem();
  const unbookmarkMutation = useUnbookmarkFeedItem();
  const feedItemIds = useMemo(() => (post ? [post.id] : /* istanbul ignore next */ []), [post]);
  const { data: userVotes = {}, refetch: refetchVotes } = useUserVotes(feedItemIds);
  /* istanbul ignore next */
  const { data: userBookmarks = {} } = useUserBookmarks(feedItemIds);
  const { gate } = useAuthGate();

  const {
    data: commentsData,
    isLoading: commentsLoading,
    hasNextPage,
    fetchNextPage,
    refetch: refetchComments,
  } = useComments(id ?? '');
  const addMutation = useAddComment(id ?? '');
  const deleteMutation = useDeleteComment(id ?? '');

  const { refreshing, onRefresh } = useRefresh(refetch, refetchVotes, refetchComments);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    androidPullProps,
  } = usePullToRefresh(onRefresh, refreshing);

  const comments = useMemo(() => commentsData?.pages.flatMap((p) => p) ?? [], [commentsData]);

  // --- Comment likes ---
  const commentIds = useMemo(() => comments.map((c) => c.id), [comments]);
  const { data: likedCommentIds = {} } = useUserCommentLikes(commentIds);
  const likeMutation = useLikeComment(id ?? '');
  const unlikeMutation = useUnlikeComment(id ?? '');

  // --- Reply state ---
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  /** @contract Resolve parentCommentId: nested replies always go under the top-level parent.
   *  @invariant Max nesting depth is 1 — a reply to a reply still points to the root comment. */
  const handleReply = useCallback(
    (comment: FeedComment) => {
      const parentId = comment.parent_comment_id ?? comment.id;
      setReplyTarget({
        commentId: comment.id,
        parentCommentId: parentId,
        displayName: comment.profile?.display_name ?? t('feed.anonymous'),
      });
    },
    [t],
  );

  /* istanbul ignore next -- no-op handler body is intentionally empty */
  const handleNoOp = (_item: NewsFeedItem) => {};

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

  const handleBookmark = useCallback(
    (itemId: string) => {
      if (userBookmarks[itemId]) {
        unbookmarkMutation.mutate({ feedItemId: itemId });
      } else {
        bookmarkMutation.mutate({ feedItemId: itemId });
      }
    },
    [userBookmarks, bookmarkMutation, unbookmarkMutation],
  );

  // @edge: gate() wrappers memoized to avoid creating new function refs every render — prevents FeedCard re-renders
  const gatedUpvote = useMemo(() => gate(handleUpvote), [gate, handleUpvote]);
  const gatedDownvote = useMemo(() => gate(handleDownvote), [gate, handleDownvote]);
  const gatedBookmark = useMemo(() => gate(handleBookmark), [gate, handleBookmark]);

  // @contract: own user ID routes to /profile (tab), other users route to /user/:id (standalone)
  const handleEntityPress = (entityType: FeedEntityType, entityId: string) => {
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
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <SafeAreaCover />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('postDetail.title')}</Text>
      </View>

      {/* @contract ScrollView flex:1; CommentInput below in flex column for keyboard avoidance */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScroll={handlePullScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        {...androidPullProps}
      >
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          refreshing={refreshing}
        />
        {feedLoading ? (
          <PostContentSkeleton />
        ) : post ? (
          <>
            <FeedCard
              item={post}
              onPress={handleNoOp}
              onEntityPress={handleEntityPress}
              userVote={userVotes[post.id] ?? null}
              isBookmarked={!!userBookmarks[post.id]}
              onUpvote={gatedUpvote}
              onDownvote={gatedDownvote}
              onBookmark={gatedBookmark}
              showFullTimestamp
            />
            <View style={styles.commentsList}>
              <Text style={styles.commentsHeader}>
                {t('postDetail.comments')} ({post.comment_count})
              </Text>
              <CommentsList
                comments={comments}
                userId={userId}
                likedCommentIds={likedCommentIds}
                isLoading={commentsLoading}
                hasNextPage={hasNextPage}
                onLoadMore={fetchNextPage}
                onDelete={(commentId, parentCommentId) =>
                  deleteMutation.mutate(
                    { commentId, parentCommentId },
                    {
                      onError: () =>
                        Alert.alert(t('common.error'), t('common.failedToDeleteComment')),
                    },
                  )
                }
                onReply={gate(handleReply)}
                onLike={gate((commentId: string) => likeMutation.mutate({ commentId }))}
                onUnlike={gate((commentId: string) => unlikeMutation.mutate({ commentId }))}
              />
            </View>
          </>
        ) : (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray500} />
            <Text style={{ color: colors.gray500, marginTop: 8 }}>{t('postDetail.notFound')}</Text>
          </View>
        )}
      </ScrollView>

      <CommentInput
        isAuthenticated={!!user}
        onSubmit={(body, parentCommentId) =>
          addMutation.mutate(
            { body, parentCommentId },
            { onError: () => Alert.alert(t('common.error'), t('common.failedToAddComment')) },
          )
        }
        onLoginPress={() => router.push('/(auth)/login' as Parameters<typeof router.push>[0])}
        bottomInset={insets.bottom}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
        avatarUrl={profile?.avatar_url}
      />
    </KeyboardAvoidingView>
  );
}
