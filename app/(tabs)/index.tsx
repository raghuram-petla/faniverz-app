import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import { usePersonalizedFeed, useUserVotes, useEntityFollows } from '@/features/feed';
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
import { useFeedActions } from '@/hooks/useFeedActions';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import { FeedContentSkeleton } from '@/components/feed/FeedContentSkeleton';
import { CommentsBottomSheet } from '@/components/feed/CommentsBottomSheet';
import { deriveEntityType, getEntityId, FEED_PILLS } from '@/constants/feedHelpers';
import type { NewsFeedItem } from '@shared/types';
import type { ImageViewerTopChrome } from '@/providers/ImageViewerProvider';

const PROGRAMMATIC_REFRESH_MIN_MS = 450;
const IOS_RESTING_CONTENT_LIFT = 8;
const IOS_REFRESH_SLOT_TOP_GAP = 20;
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
  const { allItems, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    usePersonalizedFeed(filter);
  const { activeVideoId, mountedVideoIds, registerVideoLayout, handleScrollForVideo } =
    useActiveVideo(); // @sync one auto-playing video, but multiple nearby cards can stay mounted for single-tap playback
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
  const { refreshing, onRefresh } = useRefresh(refetch, refetchVotes);
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
  const homeTabActionRef = useRef<{ scrollToTop: () => void }>({ scrollToTop: () => {} });
  // @coupling FlashList can cache header content; extraData forces the pull indicator + filter pills to refresh with programmatic state changes.
  const listExtraData = useMemo(
    () => ({ filter, refreshing, showProgrammaticRefreshIndicator }),
    [filter, refreshing, showProgrammaticRefreshIndicator],
  );
  // @edge iOS rests slightly closer to the header, but refresh slot spacing preserves its own breathing room above the bubble.
  const listTopPadding = totalHeaderHeight - (isAndroid ? 0 : IOS_RESTING_CONTENT_LIFT);
  const runProgrammaticRefresh = useCallback(() => {
    if (refreshing || showProgrammaticRefreshIndicator) return;
    // @sideeffect Mirrors tab-press refreshes into the shared indicator state so iOS can
    // swap from arrow -> spinner even if FlashList keeps the header tree mounted.
    showRefreshIndicator();
    setShowProgrammaticRefreshIndicator(true);
    const startedAt = Date.now();

    void onRefresh().finally(() => {
      const remainingMs = Math.max(0, PROGRAMMATIC_REFRESH_MIN_MS - (Date.now() - startedAt));
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

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      hideRefreshIndicator();
    };
  }, [hideRefreshIndicator]);

  // @contract Active-tab presses come through useScrollToTop; at top we refresh, otherwise we reuse the standard scroll-to-top behavior.
  homeTabActionRef.current.scrollToTop = () => {
    if (scrollOffsetRef.current <= 2) {
      runProgrammaticRefresh();
    } else {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };
  useScrollToTop(homeTabActionRef);

  // @coupling useFeedActions owns all user-initiated action handlers; component owns data + scroll + layout
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

  const getImageViewerTopChrome = useCallback(
    (): ImageViewerTopChrome => ({
      variant: 'home-feed',
      insetTop: insets.top,
      headerContentHeight: HOME_FEED_HEADER_CONTENT_HEIGHT,
      headerTranslateY: getCurrentHeaderTranslateY(),
    }),
    [getCurrentHeaderTranslateY, insets.top],
  );
  const homeFeedPills = (
    <View testID="home-feed-pills-wrap">
      <FeedFilterPills filter={filter} setFilter={setFilter} />
    </View>
  );
  const shouldRenderRefreshSlot = !isAndroid || showProgrammaticRefreshIndicator;
  const refreshSlotRefreshing = isAndroid
    ? showProgrammaticRefreshIndicator
    : refreshing || showProgrammaticRefreshIndicator;

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      <FeedHeader
        insetTop={insets.top}
        headerTranslateY={headerTranslateY}
        totalHeaderHeight={totalHeaderHeight}
      />

      {isLoading ? (
        <View style={[styles.scroll, { paddingTop: listTopPadding }]}>
          {homeFeedPills}
          <FeedContentSkeleton />
        </View>
      ) : (
        <View style={styles.scroll}>
          <FlashList
            ref={listRef}
            data={allItems}
            extraData={listExtraData}
            keyExtractor={(item) => item.id}
            drawDistance={500}
            overScrollMode={isAndroid ? 'always' : 'never'}
            contentContainerStyle={{ paddingTop: listTopPadding }}
            showsVerticalScrollIndicator={false}
            onRefresh={isAndroid ? onRefresh : undefined}
            refreshing={isAndroid ? refreshing : undefined}
            progressViewOffset={isAndroid ? totalHeaderHeight : undefined}
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
                {shouldRenderRefreshSlot && (
                  <PullToRefreshIndicator
                    pullDistance={pullDistance}
                    isRefreshing={isRefreshing}
                    refreshing={refreshSlotRefreshing}
                    topGap={isAndroid ? 0 : IOS_REFRESH_SLOT_TOP_GAP}
                  />
                )}
                {homeFeedPills}
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
