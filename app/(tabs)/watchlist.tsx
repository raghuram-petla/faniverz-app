import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

// @edge Android requires explicit opt-in for LayoutAnimation; iOS supports it by default
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useWatchlistPaginated } from '@/features/watchlist/hooks';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSmartPagination } from '@/hooks/useSmartPagination';
import { WATCHLIST_PAGINATION } from '@/constants/paginationConfig';
import { useScrollToTop } from '@react-navigation/native';
import { EmptyState } from '@/components/ui/EmptyState';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { WatchlistSkeleton } from '@/components/watchlist/WatchlistSkeleton';
import { SectionTitle, type WatchlistListItem } from '@/components/watchlist/WatchlistSectionTitle';
import { useTheme } from '@/theme';
import { AvailableCard, UpcomingCard, WatchedCard } from '@/components/watchlist/WatchlistCards';
import { createStyles } from '@/styles/tabs/watchlist.styles';

// @boundary Watchlist tab — three sections (available, upcoming, watched) with collapsible headers
// @coupling useWatchlistPaginated, useAuth — requires authenticated user for data fetch
export default function WatchlistScreen() {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  // @edge userId defaults to '' when user is null — triggers guest view early return below
  const userId = user?.id ?? '';

  // @contract: useWatchlistPaginated splits entries into three buckets server-side by status
  // @coupling: available/upcoming/watched categorization mirrors deriveMovieStatus in @shared/movieStatus
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
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    refreshControl,
  } = usePullToRefresh(onRefresh, refreshing);
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  // @contract totalSaved excludes watched — only available + upcoming count as "saved"
  const totalSaved = available.length + upcoming.length;
  // @invariant hasContent is true if any section has items — drives empty vs content state
  const hasContent = totalSaved > 0 || watched.length > 0;
  const animationsEnabled = useAnimationsEnabled();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  // @sideeffect Triggers LayoutAnimation before state update for smooth collapse/expand
  // @assumes animationsEnabled respects user's reduced motion preference
  const toggleSection = (sectionKey: string) => {
    if (animationsEnabled) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // @contract Builds flat list interleaving section headers and entries; collapsed sections omit entries
  // @coupling WatchlistListItem union type — discriminated on 'type' field for renderItem switch
  const listItems = useMemo<WatchlistListItem[]>(() => {
    const items: WatchlistListItem[] = [];

    if (available.length > 0) {
      items.push({
        type: 'section-header',
        key: 'header-available',
        sectionKey: 'available',
        title: t('watchlist.availableToWatch'),
        iconName: 'play-circle-outline',
        iconColor: colors.green500,
      });
      if (!collapsedSections.available) {
        available.forEach((entry) =>
          items.push({ type: 'available', key: `available-${entry.id}`, entry }),
        );
      }
    }

    if (upcoming.length > 0) {
      items.push({
        type: 'section-header',
        key: 'header-upcoming',
        sectionKey: 'upcoming',
        title: t('watchlist.upcomingReleases'),
        iconName: 'calendar-outline',
        iconColor: colors.blue500,
      });
      if (!collapsedSections.upcoming) {
        upcoming.forEach((entry) =>
          items.push({ type: 'upcoming', key: `upcoming-${entry.id}`, entry }),
        );
      }
    }

    if (watched.length > 0) {
      items.push({
        type: 'section-header',
        key: 'header-watched',
        sectionKey: 'watched',
        title: t('watchlist.watchedMovies'),
        iconName: 'eye-outline',
        iconColor: colors.gray500,
      });
      if (!collapsedSections.watched) {
        watched.forEach((entry) =>
          items.push({ type: 'watched', key: `watched-${entry.id}`, entry }),
        );
      }
    }

    return items;
  }, [available, upcoming, watched, t, collapsedSections]);

  const renderItem = ({ item }: { item: WatchlistListItem }) => {
    switch (item.type) {
      case 'section-header':
        return (
          <SectionTitle
            iconName={item.iconName}
            iconColor={item.iconColor}
            title={item.title}
            collapsed={collapsedSections[item.sectionKey]}
            onToggle={() => toggleSection(item.sectionKey)}
          />
        );
      case 'available':
        return <AvailableCard entry={item.entry} userId={userId} styles={styles} />;
      case 'upcoming':
        return <UpcomingCard entry={item.entry} userId={userId} styles={styles} />;
      case 'watched':
        return <WatchedCard entry={item.entry} userId={userId} styles={styles} />;
      /* istanbul ignore next */
      default:
        return null;
    }
  };

  const { handleEndReached, onEndReachedThreshold } = useSmartPagination({
    totalItems: available.length + upcoming.length + watched.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    config: WATCHLIST_PAGINATION,
  });

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader} testID="footer-loader">
        <ActivityIndicator size="small" color={colors.red600} />
      </View>
    );
  };

  // @boundary Guest / unauthenticated state — shows sign-in prompt with EmptyState
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
        <WatchlistSkeleton />
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
        onEndReachedThreshold={onEndReachedThreshold}
        ListFooterComponent={renderFooter}
        onScroll={handlePullScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        refreshControl={refreshControl}
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
