import { useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  usePersonalizedFeed,
  useVoteFeedItem,
  useRemoveFeedVote,
  useUserVotes,
} from '@/features/feed';
import { useFeedStore } from '@/stores/useFeedStore';
import { useActiveVideo } from '@/hooks/useActiveVideo';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedHeader, useCollapsibleHeader } from '@/components/feed/FeedHeader';
import { FeedFilterPills } from '@/components/feed/FeedFilterPills';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollToTop } from '@react-navigation/native';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import type { NewsFeedItem } from '@shared/types';

function handleFeedItemPress(_item: NewsFeedItem) {
  // TODO: Navigate to content detail (video player, poster view, etc.)
}

export default function FeedScreen() {
  const { theme, colors } = useTheme();
  const styles = createFeedStyles(theme);
  const insets = useSafeAreaInsets();
  const { filter, setFilter } = useFeedStore();
  const { headerTranslateY, totalHeaderHeight, handleScroll } = useCollapsibleHeader(insets.top);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    usePersonalizedFeed(filter);
  const voteMutation = useVoteFeedItem();
  const removeMutation = useRemoveFeedVote();
  const { activeVideoId, registerVideoLayout, handleScrollForVideo } = useActiveVideo();

  const allItems = useMemo(() => {
    const flat = data?.pages.flatMap((page) => page) ?? [];
    const seen = new Set<string>();
    return flat.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data?.pages]);
  const feedItemIds = useMemo(() => allItems.map((i) => i.id), [allItems]);
  const { data: userVotes = {}, refetch: refetchVotes } = useUserVotes(feedItemIds);
  const { refreshing, onRefresh } = useRefresh(refetch, refetchVotes);
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
  );
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

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

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={styles.screen}>
      <SafeAreaCover />

      <FeedHeader
        insetTop={insets.top}
        headerTranslateY={headerTranslateY}
        totalHeaderHeight={totalHeaderHeight}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: totalHeaderHeight }]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          handlePullScroll(e);
          handleScroll(e);
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 300) {
            loadMore();
          }
          handleScrollForVideo(contentOffset.y, layoutMeasurement.height);
        }}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          refreshing={refreshing}
        />

        {/* Filter pills */}
        <FeedFilterPills filter={filter} setFilter={setFilter} styles={styles} />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.red600} />
          </View>
        ) : allItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color={colors.gray500} />
            <Text style={styles.emptyTitle}>No updates yet</Text>
            <Text style={styles.emptySubtitle}>
              Check back soon for trailers, posters, and exclusive content!
            </Text>
          </View>
        ) : (
          <View style={styles.feedList}>
            {allItems.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                onPress={handleFeedItemPress}
                userVote={userVotes[item.id] ?? null}
                onUpvote={handleUpvote}
                onDownvote={handleDownvote}
                isVideoActive={activeVideoId === item.id}
                onVideoLayout={item.youtube_id ? registerVideoLayout : undefined}
              />
            ))}
            {isFetchingNextPage ? <ActivityIndicator size="small" color={colors.red600} /> : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
