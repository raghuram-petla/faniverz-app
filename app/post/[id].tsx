import { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
} from '@/features/feed';
import { useAuthGate } from '@/hooks/useAuthGate';
import { FeedCard } from '@/components/feed/FeedCard';
import { CommentsList } from '@/components/feed/CommentsList';
import { CommentInput } from '@/components/feed/CommentInput';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { createPostDetailStyles } from '@/styles/postDetail.styles';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';

export default function PostDetailScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createPostDetailStyles(theme);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: post, isLoading: feedLoading, refetch } = useFeedItem(id ?? '');
  const voteMutation = useVoteFeedItem();
  const removeMutation = useRemoveFeedVote();
  const feedItemIds = useMemo(() => (post ? [post.id] : []), [post]);
  const { data: userVotes = {}, refetch: refetchVotes } = useUserVotes(feedItemIds);
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
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
  );

  const comments = useMemo(() => commentsData?.pages.flatMap((p) => p) ?? [], [commentsData]);

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

  const handleEntityPress = (entityType: FeedEntityType, entityId: string) => {
    if (entityType === 'user') {
      if (entityId === user?.id) {
        router.push('/profile' as Parameters<typeof router.push>[0]);
      } else {
        Alert.alert(t('postDetail.comingSoon'), t('feed.userProfilesNotAvailable'));
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
    <View style={styles.screen}>
      <SafeAreaCover />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('postDetail.title')}</Text>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handlePullScroll}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          refreshing={refreshing}
        />
        {feedLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.red600} />
          </View>
        ) : post ? (
          <>
            <FeedCard
              item={post}
              onPress={handleNoOp}
              onEntityPress={handleEntityPress}
              userVote={userVotes[post.id] ?? null}
              onUpvote={gate(handleUpvote)}
              onDownvote={gate(handleDownvote)}
            />

            {/* Comments */}
            <View style={styles.commentsList}>
              <Text style={styles.commentsHeader}>
                {t('postDetail.comments')} ({post.comment_count})
              </Text>
              <CommentsList
                comments={comments}
                userId={userId}
                isLoading={commentsLoading}
                hasNextPage={hasNextPage}
                onLoadMore={fetchNextPage}
                onDelete={(commentId) => deleteMutation.mutate(commentId)}
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

      {/* Comment input */}
      <CommentInput
        isAuthenticated={!!user}
        onSubmit={(body) => addMutation.mutate(body)}
        onLoginPress={() => router.push('/(auth)/login' as Parameters<typeof router.push>[0])}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
