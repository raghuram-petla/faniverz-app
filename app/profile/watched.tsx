import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import ScreenHeader from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useWatchlist } from '@/features/watchlist/hooks';
import { WatchlistEntry } from '@/types';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { ProfileGridSkeleton } from '@/components/profile/ProfileGridSkeleton';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { formatWatchTime } from '@/utils/formatDate';
import { createStyles } from '@/styles/profile/watched.styles';
import { getImageUrl } from '@shared/imageUrl';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const FALLBACK_RUNTIME_MINUTES = 90;

type SortKey = 'recent' | 'rating' | 'title';

const SORT_OPTION_KEYS: { key: SortKey; i18nKey: string }[] = [
  { key: 'recent', i18nKey: 'profile.sortRecentlyWatched' },
  { key: 'rating', i18nKey: 'profile.sortHighestRated' },
  { key: 'title', i18nKey: 'profile.sortTitleAZ' },
];

export default function WatchedMoviesScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { watched, isLoading, refetch } = useWatchlist(user?.id ?? '');

  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);

  const sorted = useMemo(() => {
    const copy = [...(watched ?? [])];
    if (sortKey === 'recent') {
      return copy.sort((a, b) => {
        const aTime = a.watched_at ? new Date(a.watched_at).getTime() : 0;
        const bTime = b.watched_at ? new Date(b.watched_at).getTime() : 0;
        return bTime - aTime;
      });
    }
    if (sortKey === 'rating') {
      return copy.sort((a, b) => (b.movie?.rating ?? 0) - (a.movie?.rating ?? 0));
    }
    // title A-Z
    return copy.sort((a, b) => (a.movie?.title ?? '').localeCompare(b.movie?.title ?? ''));
  }, [watched, sortKey]);

  const count = sorted.length;
  const avgRating =
    count > 0
      ? (sorted.reduce((sum, e) => sum + (e.movie?.rating ?? 0), 0) / count).toFixed(1)
      : '—';
  const watchTimeMinutes = sorted.reduce(
    (sum, e) => sum + (e.movie?.runtime ?? FALLBACK_RUNTIME_MINUTES),
    0,
  );
  const watchTimeLabel = count > 0 ? formatWatchTime(watchTimeMinutes) : '—';

  const activeSortLabel = SORT_OPTION_KEYS.find((o) => o.key === sortKey)
    ? t(SORT_OPTION_KEYS.find((o) => o.key === sortKey)!.i18nKey)
    : t('profile.sort');

  // Build rows for the 2-col grid
  const rows: WatchlistEntry[][] = [];
  for (let i = 0; i < sorted.length; i += 2) {
    rows.push(sorted.slice(i, i + 2));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      onScroll={handlePullScroll}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      scrollEventThrottle={16}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        refreshing={refreshing}
      />
      {/* Header */}
      <ScreenHeader
        title={t('profile.watchedMovies')}
        titleBadge={
          count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{count}</Text>
            </View>
          )
        }
      />

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{count}</Text>
          <Text style={styles.statLabel}>{t('profile.moviesWatched')}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.ratingValueRow}>
            <Ionicons name="star" size={14} color={colors.yellow400} />
            <Text style={styles.statValue}>{avgRating}</Text>
          </View>
          <Text style={styles.statLabel}>{t('profile.avgRating')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{watchTimeLabel}</Text>
          <Text style={styles.statLabel}>{t('profile.watchTime')}</Text>
        </View>
      </View>

      {/* Sort Dropdown */}
      <View style={styles.sortWrapper}>
        <TouchableOpacity
          style={styles.sortDropdown}
          activeOpacity={0.8}
          onPress={() => setSortMenuOpen((v) => !v)}
        >
          <Ionicons name="swap-vertical-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.sortDropdownText}>{activeSortLabel}</Text>
          <Ionicons
            name={sortMenuOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={theme.textTertiary}
          />
        </TouchableOpacity>
        {sortMenuOpen && (
          <View style={styles.sortMenu}>
            {SORT_OPTION_KEYS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortMenuItem, sortKey === opt.key && styles.sortMenuItemActive]}
                activeOpacity={0.7}
                onPress={() => {
                  setSortKey(opt.key);
                  setSortMenuOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.sortMenuItemText,
                    sortKey === opt.key && styles.sortMenuItemTextActive,
                  ]}
                >
                  {t(opt.i18nKey)}
                </Text>
                {sortKey === opt.key && (
                  <Ionicons name="checkmark" size={14} color={colors.red500} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <ProfileGridSkeleton testID="watched-skeleton" />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="eye-outline"
          title={t('profile.noWatchedMovies')}
          subtitle={t('profile.noWatchedMoviesSubtitle')}
        />
      ) : (
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((entry) => {
                const movie = entry.movie;
                const posterUrl =
                  getImageUrl(movie?.poster_url ?? null, 'sm') ?? PLACEHOLDER_POSTER;
                const title = movie?.title ?? 'Unknown';
                const rating = movie?.rating ?? 0;
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.movieCard}
                    activeOpacity={0.8}
                    onPress={() => movie?.id && router.push(`/movie/${movie.id}`)}
                    accessibilityLabel={title}
                  >
                    <View style={styles.posterWrapper}>
                      <Image
                        source={{ uri: posterUrl }}
                        style={styles.poster}
                        contentFit="cover"
                        transition={200}
                      />
                      {/* Green check badge */}
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={12} color={theme.textPrimary} />
                      </View>
                      {/* Rating badge */}
                      {rating > 0 && (
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={10} color={colors.yellow400} />
                          <Text style={styles.ratingBadgeText}>{rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.movieTitle} numberOfLines={2}>
                      {title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {/* Odd padding */}
              {row.length === 1 && <View style={[styles.movieCard, styles.movieCardEmpty]} />}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
