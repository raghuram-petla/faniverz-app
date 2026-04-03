import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient, useIsRestoring } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import {
  usePersonalizedFeed,
  useUserVotes,
  useEntityFollows,
  useBookmarkFeedItem,
  useUnbookmarkFeedItem,
  useUserBookmarks,
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
import {
  PullToRefreshIndicator,
  RefreshingPillOverlay,
} from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useFeedRefreshBuffer } from '@/hooks/useFeedRefreshBuffer';
import { useFeedActions } from '@/hooks/useFeedActions';
import { useAuthGate } from '@/hooks/useAuthGate';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import { FeedContentSkeleton } from '@/components/feed/FeedContentSkeleton';
import { CommentsBottomSheet } from '@/components/feed/CommentsBottomSheet';
import { deriveEntityType, getEntityId, FEED_PILLS } from '@/constants/feedHelpers';
import type { NewsFeedItem } from '@shared/types';
import type { ImageViewerTopChrome } from '@/providers/ImageViewerProvider';

const PROGRAMMATIC_REFRESH_MIN_MS = 450;
export default function FeedScreen() {
  const isAndroid = Platform.OS === 'android';
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createFeedStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  // @sync filter persists in Zustand store — survives tab switches but not app restarts
  const { filter, setFilter } = useFeedStore();
  const { headerTranslateY, totalHeaderHeight, handleScroll, getCurrentHeaderTranslateY } =
    useCollapsibleHeader(insets.top); // @sideeffect attaches animated translateY to scroll position
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();
  const {
    allItems,
    isLoading,
    isRefreshingFirstPage,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = usePersonalizedFeed(filter);
  const bookmarkMutation = useBookmarkFeedItem();
  const unbookmarkMutation = useUnbookmarkFeedItem();
  const { activeVideoId, mountedVideoIds, registerVideoLayout, handleScrollForVideo } =
    useActiveVideo();
  const { followSet } = useEntityFollows();
  const [commentSheetItemId, setCommentSheetItemId] = useState<string | null>(null);
  const [showProgrammaticRefreshIndicator, setShowProgrammaticRefreshIndicator] = useState(false);
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
  /* istanbul ignore next */
  const { data: userBookmarks = {}, refetch: refetchBookmarks } = useUserBookmarks(feedItemIds);
  const { refreshing, onRefresh: baseOnRefresh } = useRefresh(
    refetch,
    refetchVotes,
    refetchBookmarks,
  );
  // @sideeffect Scroll to top at the start of any refresh so new content is visible
  const onRefresh = useCallback(
    () => (listRef.current?.scrollToOffset({ offset: 0, animated: true }), baseOnRefresh()),
    [baseOnRefresh],
  );
  const {
    pullDistance,
    isRefreshing,
    showRefreshIndicator,
    hideRefreshIndicator,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);
  const listRef = useRef<FlashListRef<NewsFeedItem>>(null);
  const scrollOffsetRef = useRef(0);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* istanbul ignore next -- placeholder replaced immediately on render */
  const homeTabActionRef = useRef<{ scrollToTop: () => void }>({ scrollToTop: () => {} });
  const listExtraData = useMemo(
    () => ({ filter, refreshing, showProgrammaticRefreshIndicator, isRefreshingFirstPage }),
    [filter, refreshing, showProgrammaticRefreshIndicator, isRefreshingFirstPage],
  );
  const runProgrammaticRefresh = useCallback(() => {
    if (refreshing || showProgrammaticRefreshIndicator) return;
    showRefreshIndicator();
    setShowProgrammaticRefreshIndicator(true);
    const startedAt = Date.now();

    void onRefresh().finally(() => {
      const remainingMs = Math.max(0, PROGRAMMATIC_REFRESH_MIN_MS - (Date.now() - startedAt));
      /* istanbul ignore next -- defensive: guard prevents re-entry so existing timeout is unreachable */
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        hideRefreshIndicator();
        setShowProgrammaticRefreshIndicator(false);
        refreshTimeoutRef.current = null;
      }, remainingMs);
    });
  }, [
    hideRefreshIndicator,
    onRefresh,
    refreshing,
    showProgrammaticRefreshIndicator,
    showRefreshIndicator,
  ]);

  useEffect(
    () => () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      hideRefreshIndicator();
    },
    [hideRefreshIndicator],
  );

  // @contract Active-tab presses come through useScrollToTop; at top we refresh, otherwise we reuse the standard scroll-to-top behavior.
  homeTabActionRef.current.scrollToTop = () => {
    if (scrollOffsetRef.current <= 2) {
      runProgrammaticRefresh();
    } else {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };
  useScrollToTop(homeTabActionRef);

  const {
    handleShare,
    handleEntityPress,
    handleFeedItemPress,
    handleComment,
    gatedUpvote,
    gatedDownvote,
    gatedFollow,
    gatedUnfollow,
  } = useFeedActions({ allItems, userVotes, setCommentSheetItemId });

  const { gate } = useAuthGate();
  const handleBookmark = useCallback(
    (itemId: string) => {
      (userBookmarks[itemId] ? unbookmarkMutation : bookmarkMutation).mutate({
        feedItemId: itemId,
      });
    },
    [userBookmarks, bookmarkMutation, unbookmarkMutation],
  );
  const gatedBookmark = useMemo(() => gate(handleBookmark), [gate, handleBookmark]);

  const getImageViewerTopChrome = useCallback(
    (): ImageViewerTopChrome => ({
      variant: 'home-feed',
      insetTop: insets.top,
      headerContentHeight: HOME_FEED_HEADER_CONTENT_HEIGHT,
      headerTranslateY: getCurrentHeaderTranslateY(),
    }),
    [getCurrentHeaderTranslateY, insets.top],
  );
  // @sideeffect pill shows only for user-initiated refreshes (pull-to-refresh + tab-tap)
  const refreshSlotRefreshing = refreshing || showProgrammaticRefreshIndicator;
  const { displayItems, noNewData } = useFeedRefreshBuffer(allItems, refreshSlotRefreshing);

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      <FeedHeader
        insetTop={insets.top}
        headerTranslateY={headerTranslateY}
        totalHeaderHeight={totalHeaderHeight}
      />

      {isLoading || isRestoring ? (
        <View style={[styles.scroll, { paddingTop: totalHeaderHeight }]}>
          <View testID="home-feed-pills-wrap">
            <FeedFilterPills filter={filter} setFilter={setFilter} />
          </View>
          <FeedContentSkeleton />
        </View>
      ) : (
        <View style={styles.scroll}>
          {/* @edge Android: FlashList doesn't re-measure ListHeaderComponent in production builds */}
          {isAndroid && (
            <RefreshingPillOverlay visible={refreshSlotRefreshing} topOffset={totalHeaderHeight} />
          )}
          <FlashList
            ref={listRef}
            data={displayItems}
            extraData={listExtraData}
            keyExtractor={(item) => item.id}
            drawDistance={500}
            maintainVisibleContentPosition={{ disabled: true }}
            overScrollMode={isAndroid ? 'always' : 'never'}
            contentContainerStyle={{ paddingTop: totalHeaderHeight }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              isAndroid ? (
                <RefreshControl
                  refreshing={false}
                  onRefresh={onRefresh}
                  colors={[theme.background]}
                  progressBackgroundColor={theme.textPrimary}
                  progressViewOffset={totalHeaderHeight}
                />
              ) : undefined
            }
            onLayout={(e) => {
              handleScrollForVideo(scrollOffsetRef.current, e.nativeEvent.layout.height);
            }}
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
                  refreshing={refreshSlotRefreshing}
                  noNewData={noNewData}
                />
                <View testID="home-feed-pills-wrap">
                  <FeedFilterPills filter={filter} setFilter={setFilter} />
                </View>
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
                isBookmarked={!!userBookmarks[item.id]}
                onUpvote={gatedUpvote} /* @boundary gate wraps — guests see login prompt */
                onDownvote={gatedDownvote}
                onBookmark={gatedBookmark}
                onComment={handleComment}
                onShare={handleShare}
                isVideoActive={activeVideoId === item.id}
                shouldMountVideo={mountedVideoIds.includes(
                  item.id,
                )} /* @coupling useActiveVideo decides which nearby cards are warm enough to mount early */
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
