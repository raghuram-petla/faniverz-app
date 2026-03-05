import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useNewsFeed, useFeaturedFeed } from '@/features/feed';
import { useFeedStore } from '@/stores/useFeedStore';
import { FEED_PILLS } from '@/constants/feedHelpers';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeaturedFeedCard } from '@/components/feed/FeaturedFeedCard';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import type { NewsFeedItem } from '@shared/types';
import type { FeedFilterOption } from '@/types';

function handleFeedItemPress(_item: NewsFeedItem) {
  // TODO: Navigate to content detail (video player, poster view, etc.)
}

export default function FeedScreen() {
  const { theme, colors } = useTheme();
  const styles = createFeedStyles(theme);
  const insets = useSafeAreaInsets();
  const { filter, setFilter } = useFeedStore();
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useNewsFeed(filter);
  const { data: featuredItems = [] } = useFeaturedFeed();

  const allItems = useMemo(() => data?.pages.flatMap((page) => page) ?? [], [data?.pages]);

  const showFeatured = filter === 'all' && featuredItems.length > 0;

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

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerIconBadge}>
          <Ionicons name="newspaper" size={20} color={colors.white} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>News Feed</Text>
          <Text style={styles.headerSubtitle}>Latest Updates &amp; Content</Text>
        </View>
      </View>

      {/* Filter pills */}
      <FilterPills filter={filter} setFilter={setFilter} styles={styles} />

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 300) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
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
            {/* Featured section */}
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

            {/* Feed grid */}
            <View style={styles.grid}>
              {allItems.map((item, idx) => (
                <FeedCard key={item.id} item={item} index={idx} onPress={handleFeedItemPress} />
              ))}
            </View>

            {/* Loading more */}
            {isFetchingNextPage ? <ActivityIndicator size="small" color={colors.red600} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface FilterPillsProps {
  filter: FeedFilterOption;
  setFilter: (f: FeedFilterOption) => void;
  styles: ReturnType<typeof createFeedStyles>;
}

function FilterPills({ filter, setFilter, styles }: FilterPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.pillScroll}
      contentContainerStyle={styles.pillScrollContent}
    >
      {FEED_PILLS.map((pill) => {
        const active = filter === pill.value;
        return (
          <TouchableOpacity
            key={pill.value}
            style={[
              styles.pill,
              active
                ? { backgroundColor: pill.activeColor, borderColor: pill.activeColor }
                : styles.pillInactive,
            ]}
            onPress={() => setFilter(pill.value)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filter by ${pill.label}`}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{pill.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
