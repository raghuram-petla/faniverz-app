import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useWatchlistPaginated } from '@/features/watchlist/hooks';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollToTop } from '@react-navigation/native';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingCenter } from '@/components/common/LoadingCenter';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { useTheme } from '@/theme';
import { WatchlistEntry } from '@/types';
import { AvailableCard, UpcomingCard, WatchedCard } from '@/components/watchlist/WatchlistCards';
import { createStyles } from '@/styles/tabs/watchlist.styles';

type ListItem =
  | {
      type: 'section-header';
      key: string;
      title: string;
      iconName: React.ComponentProps<typeof Ionicons>['name'];
      iconColor: string;
    }
  | { type: 'available'; key: string; entry: WatchlistEntry }
  | { type: 'upcoming'; key: string; entry: WatchlistEntry }
  | { type: 'watched'; key: string; entry: WatchlistEntry };

function SectionTitle({
  iconName,
  iconColor,
  title,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={iconName} size={20} color={iconColor} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function WatchlistScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const {
    available,
    upcoming,
    watched,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useWatchlistPaginated(userId);

  const { refreshing, onRefresh } = useRefresh(refetch);
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
  );
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  const totalSaved = available.length + upcoming.length;
  const hasContent = totalSaved > 0 || watched.length > 0;

  // Build a flat list of items with section headers
  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    if (available.length > 0) {
      items.push({
        type: 'section-header',
        key: 'header-available',
        title: 'Available to Watch',
        iconName: 'play-circle-outline',
        iconColor: colors.green500,
      });
      available.forEach((entry) => {
        items.push({ type: 'available', key: `available-${entry.id}`, entry });
      });
    }

    if (upcoming.length > 0) {
      items.push({
        type: 'section-header',
        key: 'header-upcoming',
        title: 'Upcoming Releases',
        iconName: 'calendar-outline',
        iconColor: colors.blue500,
      });
      upcoming.forEach((entry) => {
        items.push({ type: 'upcoming', key: `upcoming-${entry.id}`, entry });
      });
    }

    if (watched.length > 0) {
      items.push({
        type: 'section-header',
        key: 'header-watched',
        title: 'Watched Movies',
        iconName: 'eye-outline',
        iconColor: colors.gray500,
      });
      watched.forEach((entry) => {
        items.push({ type: 'watched', key: `watched-${entry.id}`, entry });
      });
    }

    return items;
  }, [available, upcoming, watched]);

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'section-header':
        return (
          <SectionTitle iconName={item.iconName} iconColor={item.iconColor} title={item.title} />
        );
      case 'available':
        return <AvailableCard entry={item.entry} userId={userId} styles={styles} />;
      case 'upcoming':
        return <UpcomingCard entry={item.entry} userId={userId} styles={styles} />;
      case 'watched':
        return <WatchedCard entry={item.entry} userId={userId} styles={styles} />;
    }
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader} testID="footer-loader">
        <ActivityIndicator size="small" color={colors.red600} />
      </View>
    );
  };

  // Guest / unauthenticated state
  if (!user) {
    return (
      <View style={styles.screen}>
        <SafeAreaCover />
        <View style={[styles.stickyHeader, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={styles.headerTitle}>My Watchlist</Text>
          </View>
          <View style={styles.bookmarkCircle}>
            <Ionicons name="bookmark-outline" size={24} color={colors.red500} />
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="bookmark-outline"
            title="Sign in to use Watchlist"
            subtitle="Create an account or sign in to save movies and track what you watch."
            actionLabel="Sign In / Sign Up"
            onAction={() => router.push('/(auth)/login' as Parameters<typeof router.push>[0])}
          />
        </View>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.screen}>
        <SafeAreaCover />
        <View style={[styles.stickyHeader, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={styles.headerTitle}>My Watchlist</Text>
          </View>
          <View style={styles.bookmarkCircle}>
            <Ionicons name="bookmark-outline" size={24} color={colors.red500} />
          </View>
        </View>
        <LoadingCenter />
      </View>
    );
  }

  // Empty state
  if (!hasContent) {
    return (
      <View style={styles.screen}>
        <SafeAreaCover />
        <View style={[styles.stickyHeader, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={styles.headerTitle}>My Watchlist</Text>
            <Text style={styles.headerSubtitle}>0 movies saved</Text>
          </View>
          <View style={styles.bookmarkCircle}>
            <Ionicons name="bookmark-outline" size={24} color={colors.red500} />
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="bookmark-outline"
            title="Your watchlist is empty"
            subtitle="Start adding movies to your watchlist to keep track of what you want to watch"
            actionLabel="Discover Movies"
            onAction={() => router.push('/discover')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      {/* Sticky Header */}
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>My Watchlist</Text>
          <Text style={styles.headerSubtitle}>
            {totalSaved} {totalSaved === 1 ? 'movie' : 'movies'} saved
          </Text>
        </View>
        <View style={styles.bookmarkCircle}>
          <Ionicons name="bookmark-outline" size={24} color={colors.red500} />
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={listItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        onScroll={handlePullScroll}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            isRefreshing={isRefreshing}
            refreshing={refreshing}
          />
        }
      />
    </View>
  );
}
