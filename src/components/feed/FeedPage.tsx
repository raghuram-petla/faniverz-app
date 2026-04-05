import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQueryClient, useIsRestoring } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import {
  usePersonalizedFeed,
  useUserVotes,
  useBookmarkFeedItem,
  useUnbookmarkFeedItem,
  useUserBookmarks,
  useEntityFollows,
} from '@/features/feed';
import { useActiveVideo } from '@/hooks/useActiveVideo';
import { useSmartPagination } from '@/hooks/useSmartPagination';
import { useFeedCommentPrefetch } from '@/hooks/useFeedCommentPrefetch';
import { FEED_PAGINATION } from '@/constants/paginationConfig';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useFeedRefreshBuffer } from '@/hooks/useFeedRefreshBuffer';
import { useFeedActions } from '@/hooks/useFeedActions';
import { useProgrammaticRefresh } from '@/hooks/useProgrammaticRefresh';
import { useAuthGate } from '@/hooks/useAuthGate';
import { FeedCard } from './FeedCard';
import { FeedContentSkeleton } from './FeedContentSkeleton';
import {
  PullToRefreshIndicator,
  RefreshingPillOverlay,
} from '@/components/common/PullToRefreshIndicator';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import { deriveEntityType, getEntityId, FEED_PILLS } from '@/constants/feedHelpers';
import type { FeedPageProps } from './FeedPage.types';
import type { NewsFeedItem } from '@shared/types';

/**
 * @contract Individual feed page — one per filter pill. Each page owns its own
 * FlashList, data fetching, scroll state, pagination, and video tracking.
 * @coupling FeedPager mounts one FeedPage per FEED_PILLS entry.
 */
export function FeedPage({
  filter,
  isActive,
  totalHeaderHeight,
  handleScroll: handleHeaderScroll,
  getImageViewerTopChrome,
  setCommentSheetItemId,
  scrollToTopRef,
}: FeedPageProps) {
  const isAndroid = Platform.OS === 'android';
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createFeedStyles(theme), [theme]);
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
  const { handleEndReached, onEndReachedThreshold } = useSmartPagination({
    totalItems: allItems.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    config: FEED_PAGINATION,
  });
  const { viewabilityConfig, onViewableItemsChanged, resetViewDedup } = useFeedCommentPrefetch({
    config: FEED_PAGINATION,
    queryClient,
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
  const onRefresh = useCallback(
    () => (
      resetViewDedup(),
      listRef.current?.scrollToOffset({ offset: 0, animated: true }),
      baseOnRefresh()
    ),
    [baseOnRefresh, resetViewDedup],
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
  const { showProgrammaticRefreshIndicator, runProgrammaticRefresh } = useProgrammaticRefresh({
    refreshing,
    onRefresh,
    showRefreshIndicator,
    hideRefreshIndicator,
  });

  // @contract Expose scroll-to-top for parent tab-tap handler
  scrollToTopRef.current = {
    scrollToTop: () => {
      if (scrollOffsetRef.current <= 2) runProgrammaticRefresh();
      else listRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
  };

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
  const refreshSlotRefreshing = refreshing || showProgrammaticRefreshIndicator;
  const { displayItems, noNewData } = useFeedRefreshBuffer(allItems, refreshSlotRefreshing);
  const listExtraData = useMemo(
    () => ({ refreshSlotRefreshing, isRefreshingFirstPage, userVotes, userBookmarks }),
    [refreshSlotRefreshing, isRefreshingFirstPage, userVotes, userBookmarks],
  );

  if (isLoading || isRestoring) {
    return (
      <View style={[styles.scroll, { paddingTop: totalHeaderHeight }]}>
        <FeedContentSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.scroll}>
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
        onLayout={(e) => handleScrollForVideo(scrollOffsetRef.current, e.nativeEvent.layout.height)}
        onScroll={(e) => {
          handlePullScroll(e);
          if (isActive) handleHeaderScroll(e);
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
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            isRefreshing={isRefreshing}
            refreshing={refreshSlotRefreshing}
            noNewData={noNewData}
          />
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
            onUpvote={gatedUpvote}
            onDownvote={gatedDownvote}
            onBookmark={gatedBookmark}
            onComment={handleComment}
            onShare={handleShare}
            isVideoActive={activeVideoId === item.id}
            shouldMountVideo={mountedVideoIds.includes(item.id)}
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
  );
}
