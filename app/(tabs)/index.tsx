import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Share } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import {
  usePersonalizedFeed,
  useVoteFeedItem,
  useRemoveFeedVote,
  useUserVotes,
  useEntityFollows,
  useFollowEntity,
  useUnfollowEntity,
} from '@/features/feed';
import { fetchComments } from '@/features/feed/commentsApi';
import { useFeedStore } from '@/stores/useFeedStore';
import { useActiveVideo } from '@/hooks/useActiveVideo';
import { useSmartPagination } from '@/hooks/useSmartPagination';
import { usePrefetchOnVisibility } from '@/hooks/usePrefetchOnVisibility';
import { FEED_PAGINATION, COMMENTS_PAGINATION } from '@/constants/paginationConfig';
import { FeedCard } from '@/components/feed/FeedCard';
import {
  FeedHeader,
  HOME_FEED_HEADER_CONTENT_HEIGHT,
  useCollapsibleHeader,
} from '@/components/feed/FeedHeader';
import { FeedFilterPills } from '@/components/feed/FeedFilterPills';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import { FeedContentSkeleton } from '@/components/feed/FeedContentSkeleton';
import { CommentsBottomSheet } from '@/components/feed/CommentsBottomSheet';
import { deriveEntityType, getEntityId, FEED_PILLS } from '@/constants/feedHelpers';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';
import type { ImageViewerTopChrome } from '@/providers/ImageViewerProvider';

export default function FeedScreen() {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createFeedStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  // @sync filter persists in Zustand store — survives tab switches but not app restarts
  const { filter, setFilter } = useFeedStore();
  const { headerTranslateY, totalHeaderHeight, handleScroll, getCurrentHeaderTranslateY } =
    useCollapsibleHeader(insets.top); // @sideeffect attaches animated translateY to scroll position
  const queryClient = useQueryClient();
  const { allItems, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    usePersonalizedFeed(filter);
  const voteMutation = useVoteFeedItem(); // @sideeffect optimistic updates via TanStack Query cache
  const removeMutation = useRemoveFeedVote();
  const { activeVideoId, registerVideoLayout, handleScrollForVideo } = useActiveVideo(); // @sync single auto-playing video
  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  const { gate } = useAuthGate(); // @boundary redirects guests to login
  const { user } = useAuth();
  const router = useRouter();
  const [commentSheetItemId, setCommentSheetItemId] = useState<string | null>(null);

  const { handleEndReached, onEndReachedThreshold } = useSmartPagination({
    totalItems: allItems.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    config: FEED_PAGINATION,
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
    config: FEED_PAGINATION,
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
  const listRef = useRef<FlashListRef<NewsFeedItem>>(null);
  const navigation = useNavigation();
  const scrollOffsetRef = useRef(0);

  // @edge First tap scrolls to top; second tap (when already at top) triggers refresh
  useEffect(() => {
    return navigation.addListener('tabPress' as never, () => {
      if (scrollOffsetRef.current <= 2) {
        onRefresh();
      } else {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    });
  }, [navigation, onRefresh]);

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

  const gatedUpvote = useMemo(() => gate(handleUpvote), [gate, handleUpvote]);
  const gatedDownvote = useMemo(() => gate(handleDownvote), [gate, handleDownvote]);
  const gatedFollow = useMemo(() => gate(handleFollow), [gate, handleFollow]);
  const gatedUnfollow = useMemo(() => gate(handleUnfollow), [gate, handleUnfollow]);

  const getImageViewerTopChrome = useCallback(
    (): ImageViewerTopChrome => ({
      variant: 'home-feed',
      insetTop: insets.top,
      headerContentHeight: HOME_FEED_HEADER_CONTENT_HEIGHT,
      headerTranslateY: getCurrentHeaderTranslateY(),
    }),
    [getCurrentHeaderTranslateY, insets.top],
  );

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      <FeedHeader
        insetTop={insets.top}
        headerTranslateY={headerTranslateY}
        totalHeaderHeight={totalHeaderHeight}
      />

      {isLoading ? (
        <View style={[styles.scroll, { paddingTop: totalHeaderHeight }]}>
          <FeedFilterPills filter={filter} setFilter={setFilter} styles={styles} />
          <FeedContentSkeleton />
        </View>
      ) : (
        <View style={styles.scroll}>
          <FlashList
            ref={listRef}
            data={allItems}
            keyExtractor={(item) => item.id}
            drawDistance={500}
            contentContainerStyle={{ paddingTop: totalHeaderHeight }}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              handlePullScroll(e);
              handleScroll(e);
              const { contentOffset, layoutMeasurement } = e.nativeEvent;
              scrollOffsetRef.current = contentOffset.y;
              handleScrollForVideo(contentOffset.y, layoutMeasurement.height);
            }}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            scrollEventThrottle={16}
            onEndReached={handleEndReached}
            onEndReachedThreshold={onEndReachedThreshold}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            ListHeaderComponent={
              <>
                <PullToRefreshIndicator
                  pullDistance={pullDistance}
                  isRefreshing={isRefreshing}
                  refreshing={refreshing}
                />
                <FeedFilterPills filter={filter} setFilter={setFilter} styles={styles} />
              </>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={48} color={colors.gray500} />
                <Text style={styles.emptyTitle}>{t('feed.noUpdates')}</Text>
                <Text style={styles.emptySubtitle}>
                  {filter !== 'all'
                    ? t('feed.noFilterContent', {
                        filter: FEED_PILLS.find((p) => p.value === filter)?.label ?? filter,
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
                isVideoActive={activeVideoId === item.id}
                onVideoLayout={item.youtube_id ? registerVideoLayout : undefined}
                getImageViewerTopChrome={getImageViewerTopChrome}
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
