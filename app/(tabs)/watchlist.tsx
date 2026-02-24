import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useWatchlistPaginated, useWatchlistMutations } from '@/features/watchlist/hooks';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/theme/colors';
import { WatchlistEntry } from '@/types';

// ─── List item types ─────────────────────────────────────────────────────────

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

// ─── Movie Card ───────────────────────────────────────────────────────────────

interface AvailableCardProps {
  entry: WatchlistEntry;
  userId: string;
}

function AvailableCard({ entry, userId }: AvailableCardProps) {
  const router = useRouter();
  const { remove, markWatched } = useWatchlistMutations();
  const movie = entry.movie!;

  const statusLabel = movie.release_type === 'theatrical' ? 'In Theaters' : 'Streaming';
  const statusBg = movie.release_type === 'theatrical' ? colors.red600 : colors.purple600;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/movie/${movie.id}`)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={movie.title}
    >
      {/* Poster */}
      <View style={styles.posterWrapper}>
        <Image
          source={{ uri: movie.poster_url ?? undefined }}
          style={styles.poster}
          contentFit="cover"
          accessibilityLabel={`${movie.title} poster`}
        />
        {/* Status badge overlay */}
        <View style={[styles.posterBadge, { backgroundColor: statusBg }]}>
          <Text style={styles.posterBadgeText}>{statusLabel}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {movie.title}
        </Text>

        {movie.rating > 0 && (
          <View style={styles.metaRow}>
            <Ionicons name="star" size={12} color={colors.yellow400} />
            <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
          </View>
        )}

        <View style={styles.genreRow}>
          {movie.genres.slice(0, 2).map((genre) => (
            <Text key={genre} style={styles.genreText}>
              {genre}
            </Text>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => remove.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Remove from watchlist"
        >
          <Ionicons name="trash-outline" size={20} color={colors.red500} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => markWatched.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Mark as watched"
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.green500} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Upcoming Card ────────────────────────────────────────────────────────────

function UpcomingCard({ entry, userId }: AvailableCardProps) {
  const router = useRouter();
  const { remove, markWatched } = useWatchlistMutations();
  const movie = entry.movie!;

  const releaseDateFormatted = new Date(movie.release_date).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/movie/${movie.id}`)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={movie.title}
    >
      {/* Poster */}
      <View style={styles.posterWrapper}>
        <Image
          source={{ uri: movie.poster_url ?? undefined }}
          style={styles.poster}
          contentFit="cover"
          accessibilityLabel={`${movie.title} poster`}
        />
        {/* "Soon" badge */}
        <View style={[styles.posterBadge, { backgroundColor: colors.blue600 }]}>
          <Text style={styles.posterBadgeText}>Soon</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {movie.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.blue400} />
          <Text style={styles.releaseDateText}>{releaseDateFormatted}</Text>
        </View>

        <View style={styles.genreRow}>
          {movie.genres.slice(0, 2).map((genre) => (
            <Text key={genre} style={styles.genreText}>
              {genre}
            </Text>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => remove.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Remove from watchlist"
        >
          <Ionicons name="trash-outline" size={20} color={colors.red500} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => markWatched.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Mark as watched"
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.green500} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Watched Card ─────────────────────────────────────────────────────────────

function WatchedCard({ entry, userId }: AvailableCardProps) {
  const router = useRouter();
  const { remove, moveBack } = useWatchlistMutations();
  const movie = entry.movie!;

  return (
    <TouchableOpacity
      style={[styles.card, styles.cardWatched]}
      onPress={() => router.push(`/movie/${movie.id}`)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={movie.title}
    >
      {/* Poster */}
      <View style={styles.posterWrapper}>
        <Image
          source={{ uri: movie.poster_url ?? undefined }}
          style={[styles.poster, styles.posterWatched]}
          contentFit="cover"
          accessibilityLabel={`${movie.title} poster`}
        />
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, styles.cardTitleWatched]} numberOfLines={1}>
          {movie.title}
        </Text>

        {movie.rating > 0 && (
          <View style={styles.metaRow}>
            <Ionicons name="star" size={12} color={colors.yellow400} />
            <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
          </View>
        )}

        <View style={styles.genreRow}>
          {movie.genres.slice(0, 2).map((genre) => (
            <Text key={genre} style={styles.genreText}>
              {genre}
            </Text>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => moveBack.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Move back to watchlist"
        >
          <Ionicons name="refresh-outline" size={20} color={colors.blue500} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => remove.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Remove from watched"
        >
          <Ionicons name="trash-outline" size={20} color={colors.red500} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionTitleProps {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
}

function SectionTitle({ iconName, iconColor, title }: SectionTitleProps) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={iconName} size={20} color={iconColor} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WatchlistScreen() {
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
  } = useWatchlistPaginated(userId);

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
        return <AvailableCard entry={item.entry} userId={userId} />;
      case 'upcoming':
        return <UpcomingCard entry={item.entry} userId={userId} />;
      case 'watched':
        return <WatchedCard entry={item.entry} userId={userId} />;
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
            actionLabel="Sign In"
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
        <View style={[styles.stickyHeader, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={styles.headerTitle}>My Watchlist</Text>
          </View>
          <View style={styles.bookmarkCircle}>
            <Ionicons name="bookmark-outline" size={24} color={colors.red500} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.red600} />
        </View>
      </View>
    );
  }

  // Empty state
  if (!hasContent) {
    return (
      <View style={styles.screen}>
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
        data={listItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },

  // Header
  stickyHeader: {
    backgroundColor: colors.black95,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.white60,
    marginTop: 2,
  },
  bookmarkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.red600_20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },

  // List
  listContent: {
    paddingTop: 24,
    paddingBottom: 100,
    gap: 12,
    paddingHorizontal: 16,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  // Movie Card
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: colors.white5,
    borderRadius: 12,
  },
  cardWatched: {
    opacity: 0.8,
  },

  // Poster
  posterWrapper: {
    width: 72,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterWatched: {
    opacity: 0.7,
  },
  posterBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  posterBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },

  // Card content
  cardInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  cardTitleWatched: {
    color: colors.white60,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.white60,
  },
  releaseDateText: {
    fontSize: 12,
    color: colors.blue400,
    fontWeight: '600',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  genreText: {
    fontSize: 11,
    color: colors.white40,
  },

  // Action buttons
  actions: {
    justifyContent: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer loader
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
