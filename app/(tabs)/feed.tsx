import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import {
  useNewsFeed,
  useUserVotes,
  useEntityFollows,
  useBookmarkFeedItem,
  useUnbookmarkFeedItem,
  useUserBookmarks,
} from '@/features/feed';
import { useFeedStore } from '@/stores/useFeedStore';
import { useSmartPagination } from '@/hooks/useSmartPagination';
import { useFeedCommentPrefetch } from '@/hooks/useFeedCommentPrefetch';
import { NEWS_FEED_PAGINATION } from '@/constants/paginationConfig';
import { deriveEntityType, getEntityId, FEED_PILLS } from '@/constants/feedHelpers';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedFilterPills } from '@/components/feed/FeedFilterPills';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useFeedRefreshBuffer } from '@/hooks/useFeedRefreshBuffer';
import { useFeedActions } from '@/hooks/useFeedActions';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useTranslation } from 'react-i18next';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import { FeedContentSkeleton } from '@/components/feed/FeedContentSkeleton';
import { CommentsBottomSheet } from '@/components/feed/CommentsBottomSheet';
import type { NewsFeedItem } from '@shared/types';

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
  const bookmarkMutation = useBookmarkFeedItem();
  const unbookmarkMutation = useUnbookmarkFeedItem();
  const { followSet } = useEntityFollows();
  const [commentSheetItemId, setCommentSheetItemId] = useState<string | null>(null);
  const listRef = useRef<FlashListRef<NewsFeedItem>>(null);

  // @sideeffect Scroll to top when filter changes.
  // key={filter} was removed from FlashList because it causes a remount that races with native layout
  // in production (Hermes): scrollToOffset fires before RecyclerListView finishes its initial layout,
  // making it a no-op. Keeping FlashList mounted and using requestAnimationFrame defers the scroll
  // until after the frame is painted, by which point the list is ready to accept scroll commands.
  const prevFilterRef = useRef(filter);
  useEffect(() => {
    if (prevFilterRef.current !== filter) {
      prevFilterRef.current = filter;
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }
  }, [filter]);
  const { handleEndReached, onEndReachedThreshold } = useSmartPagination({
    totalItems: allItems.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    config: NEWS_FEED_PAGINATION,
  });

  // @coupling useFeedCommentPrefetch composes comment prefetching + view tracking into one callback
  const { viewabilityConfig, onViewableItemsChanged, resetViewDedup } = useFeedCommentPrefetch({
    config: NEWS_FEED_PAGINATION,
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
  /* istanbul ignore next -- scroll-to-top wraps baseOnRefresh; only callable via pull-to-refresh gesture */
  const onRefresh = useCallback(async () => {
    resetViewDedup();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    return baseOnRefresh();
  }, [baseOnRefresh, resetViewDedup]);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    androidPullProps,
  } = usePullToRefresh(onRefresh, refreshing);
  const { displayItems, noNewData } = useFeedRefreshBuffer(allItems, refreshing);

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

  const { gate } = useAuthGate();
  // @contract Toggle: if already bookmarked, removes; otherwise bookmarks
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
  const gatedBookmark = useMemo(() => gate(handleBookmark), [gate, handleBookmark]);

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
        <View style={styles.scroll} {...androidPullProps}>
          {/* @invariant maintainVisibleContentPosition disabled — FlashList 2.x enables scroll anchoring
              by default (designed for chat apps). On filter change, applyOffsetCorrection() fires after
              layout stabilizes and scrolls to keep the first visible trailer in view, overriding any
              programmatic scroll to top. This feed is not a chat; disable anchoring entirely. */}
          <FlashList
            ref={listRef}
            data={displayItems}
            keyExtractor={(item) => item.id}
            drawDistance={500}
            maintainVisibleContentPosition={{ disabled: true }}
            overScrollMode="never"
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
                isBookmarked={!!userBookmarks[item.id]}
                onUpvote={gatedUpvote} /* @boundary gate wraps — guests see login prompt */
                onDownvote={gatedDownvote}
                onBookmark={gatedBookmark}
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
