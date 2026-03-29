import { useCallback, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, Share } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import {
  useNewsFeed,
  useVoteFeedItem,
  useRemoveFeedVote,
  useUserVotes,
  useEntityFollows,
  useFollowEntity,
  useUnfollowEntity,
} from '@/features/feed';
import { fetchComments } from '@/features/feed/commentsApi';
import { useFeedStore } from '@/stores/useFeedStore';
import { useSmartPagination } from '@/hooks/useSmartPagination';
import { usePrefetchOnVisibility } from '@/hooks/usePrefetchOnVisibility';
import { NEWS_FEED_PAGINATION, COMMENTS_PAGINATION } from '@/constants/paginationConfig';
import { deriveEntityType, getEntityId, FEED_PILLS } from '@/constants/feedHelpers';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedFilterPills } from '@/components/feed/FeedFilterPills';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useTranslation } from 'react-i18next';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import { FeedContentSkeleton } from '@/components/feed/FeedContentSkeleton';
import { CommentsBottomSheet } from '@/components/feed/CommentsBottomSheet';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';

// @boundary News feed tab — FlashList-based feed with voting, follows, and filter pills
// @coupling useFeedStore (Zustand), useNewsFeed (distinct from usePersonalizedFeed in index.tsx)
export default function FeedScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createFeedStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { filter, setFilter } = useFeedStore();
  const queryClient = useQueryClient();
  const { allItems, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    useNewsFeed(filter);
  const voteMutation = useVoteFeedItem();
  const removeMutation = useRemoveFeedVote();
  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  const { gate } = useAuthGate();
  const { user } = useAuth();
  const router = useRouter();
  const [commentSheetItemId, setCommentSheetItemId] = useState<string | null>(null);
  const { handleEndReached, onEndReachedThreshold } = useSmartPagination({
    totalItems: allItems.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    config: NEWS_FEED_PAGINATION,
  });

  const commentKeyFactory = useCallback(
    (item: NewsFeedItem) => ['feed-comments', item.id] as const,
    [],
  );
  const commentPrefetchFn = useCallback(
    (item: NewsFeedItem) => fetchComments(item.id, 0, COMMENTS_PAGINATION.initialPageSize),
    [],
  );
  const { viewabilityConfig, onViewableItemsChanged } = usePrefetchOnVisibility<NewsFeedItem>({
    config: NEWS_FEED_PAGINATION,
    queryClient,
    queryKeyFactory: commentKeyFactory,
    queryFn: commentPrefetchFn,
  });

  const feedItemIds = useMemo(() => allItems.map((i) => i.id), [allItems]);
  /* istanbul ignore next */
  const { data: userVotes = {}, refetch: refetchVotes } = useUserVotes(feedItemIds);
  const { refreshing, onRefresh } = useRefresh(refetch, refetchVotes);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);

  // @contract Toggle behavior: re-voting with same direction removes vote; otherwise creates/switches
  // @nullable prev defaults to null when user has no existing vote on this item
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

  // @contract: isPending guards prevent duplicate follow/unfollow API calls from rapid taps in the feed
  const handleFollow = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      if (followMutation.isPending || unfollowMutation.isPending) return;
      followMutation.mutate({ entityType, entityId });
    },
    [followMutation, unfollowMutation],
  );

  const handleUnfollow = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      if (followMutation.isPending || unfollowMutation.isPending) return;
      unfollowMutation.mutate({ entityType, entityId });
    },
    [followMutation, unfollowMutation],
  );

  // @edge If entityId matches current user, routes to own profile tab instead of user detail
  // @assumes entityType values are constrained by FeedEntityType union
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

  const handleComment = useCallback((itemId: string) => {
    setCommentSheetItemId(itemId);
  }, []);

  // @sync memoize gated callbacks once — gate() returns a new wrapper each call,
  // so calling it inline in renderItem defeats FeedCard's React.memo
  const gatedUpvote = useMemo(() => gate(handleUpvote), [gate, handleUpvote]);
  const gatedDownvote = useMemo(() => gate(handleDownvote), [gate, handleDownvote]);
  const gatedFollow = useMemo(() => gate(handleFollow), [gate, handleFollow]);
  const gatedUnfollow = useMemo(() => gate(handleUnfollow), [gate, handleUnfollow]);

  return (
    <View style={styles.screen}>
      <SafeAreaCover />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerIconBadge}>
          <Ionicons name="newspaper" size={20} color={colors.white} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>{t('feed.newsFeed')}</Text>
          <Text style={styles.headerSubtitle}>{t('feed.latestUpdates')}</Text>
        </View>
      </View>

      {/* Filter pills */}
      <FeedFilterPills filter={filter} setFilter={setFilter} />

      {/* Content */}
      {isLoading ? (
        <View style={styles.scroll}>
          <FeedContentSkeleton />
        </View>
      ) : (
        // @coupling FlashList from @shopify — requires fixed estimatedItemSize or drawDistance for perf
        <View style={styles.scroll}>
          {/* @sideeffect key={filter} remounts list on filter change, resetting scroll to top */}
          <FlashList
            key={filter}
            data={allItems}
            keyExtractor={(item) => item.id}
            drawDistance={500}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={handlePullScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            scrollEventThrottle={16}
            onEndReached={handleEndReached}
            onEndReachedThreshold={onEndReachedThreshold}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            ListHeaderComponent={
              <PullToRefreshIndicator
                pullDistance={pullDistance}
                isRefreshing={isRefreshing}
                refreshing={refreshing}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={48} color={colors.gray500} />
                <Text style={styles.emptyTitle}>{t('feed.noUpdates')}</Text>
                <Text style={styles.emptySubtitle}>
                  {filter !== 'all'
                    ? t('feed.noFilterContent', {
                        filter:
                          FEED_PILLS.find((p) => p.value === filter)?.label ??
                          /* istanbul ignore next */ filter,
                      })
                    : t('feed.checkBackSoon')}
                </Text>
              </View>
            }
            ListFooterComponent={
              isFetchingNextPage ? <ActivityIndicator size="small" color={colors.red600} /> : null
            }
            renderItem={({ item, index }) => (
              <FeedCard
                item={item}
                onPress={handleFeedItemPress}
                onEntityPress={handleEntityPress}
                userVote={userVotes[item.id] ?? null}
                onUpvote={gatedUpvote} /* @boundary gate wraps — guests see login prompt */
                onDownvote={gatedDownvote}
                onComment={handleComment}
                onShare={handleShare}
                isFollowing={followSet.has(`${deriveEntityType(item)}:${getEntityId(item)}`)}
                onFollow={gatedFollow}
                onUnfollow={gatedUnfollow}
                isFirst={index === 0}
              />
            )}
          />
        </View>
      )}

      <CommentsBottomSheet
        visible={!!commentSheetItemId}
        feedItemId={commentSheetItemId ?? ''}
        onClose={() => setCommentSheetItemId(null)}
      />
    </View>
  );
}
