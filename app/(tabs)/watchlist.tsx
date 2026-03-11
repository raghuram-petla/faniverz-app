import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        title: t('watchlist.availableToWatch'),
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
        title: t('watchlist.upcomingReleases'),
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
        title: t('watchlist.watchedMovies'),
        iconName: 'eye-outline',
        iconColor: colors.gray500,
      });
      watched.forEach((entry) => {
        items.push({ type: 'watched', key: `watched-${entry.id}`, entry });
      });
    }

    return items;
  }, [available, upcoming, watched, t]);

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
            <Text style={styles.headerTitle}>{t('watchlist.title')}</Text>
          </View>
          <View style={styles.bookmarkCircle}>
            <Ionicons name="bookmark-outline" size={24} color={colors.red500} />
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="bookmark-outline"
            title={t('watchlist.signInTitle')}
            subtitle={t('watchlist.signInSubtitle')}
            actionLabel={t('auth.signIn')}
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
            <Text style={styles.headerTitle}>{t('watchlist.title')}</Text>
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
            <Text style={styles.headerTitle}>{t('watchlist.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('watchlist.moviesSaved', { count: 0 })}</Text>
          </View>
          <View style={styles.bookmarkCircle}>
            <Ionicons name="bookmark-outline" size={24} color={colors.red500} />
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="bookmark-outline"
            title={t('watchlist.empty')}
            subtitle={t('watchlist.emptySubtitle')}
            actionLabel={t('watchlist.discoverMovies')}
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
          <Text style={styles.headerTitle}>{t('watchlist.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {totalSaved === 1
              ? t('watchlist.movieSaved', { count: totalSaved })
              : t('watchlist.moviesSaved', { count: totalSaved })}
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
