import { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  usePersonalizedFeed,
  useFeaturedFeed,
  useVoteFeedItem,
  useRemoveFeedVote,
  useUserVotes,
} from '@/features/feed';
import { useFeedStore } from '@/stores/useFeedStore';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeaturedFeedCard } from '@/components/feed/FeaturedFeedCard';
import { FeedHeader, useCollapsibleHeader } from '@/components/feed/FeedHeader';
import { FeedFilterPills } from '@/components/feed/FeedFilterPills';
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
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    usePersonalizedFeed(filter);
  const { data: featuredItems = [] } = useFeaturedFeed();
  const voteMutation = useVoteFeedItem();
  const removeMutation = useRemoveFeedVote();

  const allItems = useMemo(() => data?.pages.flatMap((page) => page) ?? [], [data?.pages]);
  const feedItemIds = useMemo(() => allItems.map((i) => i.id), [allItems]);
  const { data: userVotes = {} } = useUserVotes(feedItemIds);

  const showFeatured = filter === 'all' && featuredItems.length > 0;

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

  const renderFeaturedItem = useCallback(
    ({ item }: { item: NewsFeedItem }) => (
      <FeaturedFeedCard item={item} onPress={handleFeedItemPress} />
    ),
    [],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={styles.screen}>
      <View style={[styles.safeAreaCover, { height: insets.top }]} />

      <FeedHeader
        insetTop={insets.top}
        headerTranslateY={headerTranslateY}
        totalHeaderHeight={totalHeaderHeight}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: totalHeaderHeight }]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          handleScroll(e);
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 300) {
            loadMore();
          }
        }}
        scrollEventThrottle={16}
      >
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
          <>
            {showFeatured ? (
              <View style={styles.featuredSection}>
                <Text style={styles.featuredSectionTitle}>Featured</Text>
                <FlatList
                  horizontal
                  data={featuredItems}
                  renderItem={renderFeaturedItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.featuredListContent}
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            ) : null}

            <View style={styles.grid}>
              {allItems.map((item, idx) => (
                <FeedCard
                  key={item.id}
                  item={item}
                  index={idx}
                  onPress={handleFeedItemPress}
                  userVote={userVotes[item.id] ?? null}
                  onUpvote={handleUpvote}
                  onDownvote={handleDownvote}
                />
              ))}
            </View>

            {isFetchingNextPage ? <ActivityIndicator size="small" color={colors.red600} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
