import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import ScreenHeader from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useWatchlist } from '@/features/watchlist/hooks';
import { WatchlistEntry } from '@/types';
import { colors } from '@/theme/colors';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { formatWatchTime } from '@/utils/formatDate';
import { styles } from './watched.styles';

// Avg runtime assumption for watch time estimate (90 min)
const AVG_RUNTIME_MINUTES = 90;

type SortKey = 'recent' | 'rating' | 'title';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently Watched' },
  { key: 'rating', label: 'Highest Rated' },
  { key: 'title', label: 'Title A–Z' },
];

export default function WatchedMoviesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { watched, isLoading } = useWatchlist(user?.id ?? '');

  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

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
  const watchTimeMinutes = count * AVG_RUNTIME_MINUTES;
  const watchTimeLabel = count > 0 ? formatWatchTime(watchTimeMinutes) : '—';

  const activeSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? 'Sort';

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
    >
      {/* Header */}
      <ScreenHeader
        title="Watched Movies"
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
          <Text style={styles.statLabel}>Movies Watched</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.ratingValueRow}>
            <Ionicons name="star" size={14} color={colors.yellow400} />
            <Text style={styles.statValue}>{avgRating}</Text>
          </View>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{watchTimeLabel}</Text>
          <Text style={styles.statLabel}>Watch Time</Text>
        </View>
      </View>

      {/* Sort Dropdown */}
      <View style={styles.sortWrapper}>
        <TouchableOpacity
          style={styles.sortDropdown}
          activeOpacity={0.8}
          onPress={() => setSortMenuOpen((v) => !v)}
        >
          <Ionicons name="swap-vertical-outline" size={16} color={colors.white60} />
          <Text style={styles.sortDropdownText}>{activeSortLabel}</Text>
          <Ionicons
            name={sortMenuOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.white40}
          />
        </TouchableOpacity>
        {sortMenuOpen && (
          <View style={styles.sortMenu}>
            {SORT_OPTIONS.map((opt) => (
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
                  {opt.label}
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
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.red600} />
        </View>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="eye-outline"
          title="No watched movies yet"
          subtitle="Mark movies as watched from your watchlist to track them here."
        />
      ) : (
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((entry) => {
                const movie = entry.movie;
                const posterUrl = movie?.poster_url ?? PLACEHOLDER_POSTER;
                const title = movie?.title ?? 'Unknown';
                const rating = movie?.rating ?? 0;
                return (
                  <View key={entry.id} style={styles.movieCard}>
                    <View style={styles.posterWrapper}>
                      <Image
                        source={{ uri: posterUrl }}
                        style={styles.poster}
                        contentFit="cover"
                        transition={200}
                      />
                      {/* Green check badge */}
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={12} color={colors.white} />
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
                  </View>
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
