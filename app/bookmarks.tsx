import { useCallback, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, Share } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import {
  useBookmarkedFeed,
  useVoteFeedItem,
  useRemoveFeedVote,
  useUserVotes,
  useBookmarkFeedItem,
  useUnbookmarkFeedItem,
  useUserBookmarks,
} from '@/features/feed';
import { useAuthGate } from '@/hooks/useAuthGate';
import { FeedCard } from '@/components/feed/FeedCard';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSmartPagination } from '@/hooks/useSmartPagination';
import { FEED_PAGINATION } from '@/constants/paginationConfig';
import { FeedContentSkeleton } from '@/components/feed/FeedContentSkeleton';
import { CommentsBottomSheet } from '@/components/feed/CommentsBottomSheet';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import ScreenHeader from '@/components/common/ScreenHeader';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';

// @boundary BookmarkedFeedScreen — paginated list of posts the current user has saved
// @coupling useBookmarkedFeed (paginated), useBookmarkFeedItem / useUnbookmarkFeedItem for toggle
export default function BookmarkedFeedScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createFeedStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gate } = useAuthGate();
  const [commentSheetItemId, setCommentSheetItemId] = useState<string | null>(null);

  const { allItems, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    useBookmarkedFeed();

  const voteMutation = useVoteFeedItem();
  const removeMutation = useRemoveFeedVote();
  const bookmarkMutation = useBookmarkFeedItem();
  const unbookmarkMutation = useUnbookmarkFeedItem();

  const { handleEndReached, onEndReachedThreshold } = useSmartPagination({
    totalItems: allItems.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    config: FEED_PAGINATION,
  });

  const feedItemIds = useMemo(() => allItems.map((i) => i.id), [allItems]);
  // @nullable userVotes defaults to {} when query is disabled (unauthenticated)
  /* istanbul ignore next -- destructuring default only applies when useUserVotes returns undefined */
  const { data: userVotes = {}, refetch: refetchVotes } = useUserVotes(feedItemIds);
  // @invariant All items are bookmarked by definition — set still needed for optimistic unbookmark UI
  /* istanbul ignore next -- destructuring default only applies when useUserBookmarks returns undefined */
  const { data: userBookmarks = {}, refetch: refetchBookmarks } = useUserBookmarks(feedItemIds);
  const { refreshing, onRefresh } = useRefresh(refetch, refetchVotes, refetchBookmarks);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);

  // @contract Toggle behavior: re-voting with same direction removes vote; otherwise creates/switches
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
      Share.share({ message: `${item.title} — Check it out on Faniverz!` }).catch(
        /* istanbul ignore next */ () => {},
      );
    },
    [allItems],
  );

  const handleComment = useCallback((itemId: string) => {
    setCommentSheetItemId(itemId);
  }, []);

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

  // @edge If entityId matches current user, routes to own profile tab instead of user detail
  const handleEntityPress = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      if (entityType === 'user') {
        router.push(`/user/${entityId}` as Parameters<typeof router.push>[0]);
        return;
      }
      const routes: Record<string, string> = {
        movie: `/movie/${entityId}`,
        actor: `/actor/${entityId}`,
        production_house: `/production-house/${entityId}`,
      };
      router.push(routes[entityType] as Parameters<typeof router.push>[0]);
    },
    [router],
  );

  const handleFeedItemPress = useCallback(
    (item: NewsFeedItem) => {
      router.push(`/post/${item.id}` as Parameters<typeof router.push>[0]);
    },
    [router],
  );

  // @sync memoize gated callbacks — gate() returns a new wrapper each call,
  // so calling it inline in renderItem defeats FeedCard's React.memo
  const gatedUpvote = useMemo(() => gate(handleUpvote), [gate, handleUpvote]);
  const gatedDownvote = useMemo(() => gate(handleDownvote), [gate, handleDownvote]);
  const gatedBookmark = useMemo(() => gate(handleBookmark), [gate, handleBookmark]);

  return (
    <View style={styles.screen}>
      <SafeAreaCover />

      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
        <ScreenHeader title={t('bookmarks.title')} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.scroll}>
          <FeedContentSkeleton />
        </View>
      ) : (
        <View style={styles.scroll}>
          <FlashList
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
            ListHeaderComponent={
              <PullToRefreshIndicator
                pullDistance={pullDistance}
                isRefreshing={isRefreshing}
                refreshing={refreshing}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="bookmark-outline" size={48} color={colors.gray500} />
                <Text style={styles.emptyTitle}>{t('bookmarks.empty')}</Text>
                <Text style={styles.emptySubtitle}>{t('bookmarks.emptySubtitle')}</Text>
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
