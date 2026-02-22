import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useWatchlist, useToggleWatchlist } from '@/features/watchlist/hooks';
import type { WatchlistEntry } from '@/features/watchlist/api';
import MovieListItem from '@/components/movie/MovieListItem';

function groupWatchlist(entries: WatchlistEntry[]) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const releasingSoon: WatchlistEntry[] = [];
  const alreadyReleased: WatchlistEntry[] = [];

  for (const entry of entries) {
    const releaseDate = entry.movie.release_date;
    if (releaseDate && releaseDate >= today) {
      releasingSoon.push(entry);
    } else {
      alreadyReleased.push(entry);
    }
  }

  releasingSoon.sort(
    (a, b) => new Date(a.movie.release_date).getTime() - new Date(b.movie.release_date).getTime()
  );

  return { releasingSoon, alreadyReleased };
}

export default function WatchlistScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { data: watchlist = [], isLoading, refetch } = useWatchlist(user?.id);
  const { mutate: toggle } = useToggleWatchlist();

  const { releasingSoon, alreadyReleased } = React.useMemo(
    () => groupWatchlist(watchlist),
    [watchlist]
  );

  const handleRemove = (movieId: number) => {
    if (!user?.id) return;
    toggle({ userId: user.id, movieId, isCurrentlyWatchlisted: true });
  };

  const handleMoviePress = (movieId: number) => {
    router.push(`/movie/${movieId}`);
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View testID="watchlist-login-prompt" style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to use Watchlist</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isLoading && watchlist.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View testID="watchlist-empty" style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your watchlist is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add movies from the calendar or explore tab
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const sections = [
    ...(releasingSoon.length > 0
      ? [{ type: 'header' as const, title: 'Releasing Soon', key: 'header-releasing' }]
      : []),
    ...releasingSoon.map((entry) => ({
      type: 'item' as const,
      entry,
      key: `item-${entry.id}`,
    })),
    ...(alreadyReleased.length > 0
      ? [{ type: 'header' as const, title: 'Already Released', key: 'header-released' }]
      : []),
    ...alreadyReleased.map((entry) => ({
      type: 'item' as const,
      entry,
      key: `item-${entry.id}`,
    })),
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        testID="watchlist-screen"
        data={sections}
        keyExtractor={(item) => item.key}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <Text
                testID={`section-header-${item.title}`}
                style={[styles.sectionHeader, { color: colors.text }]}
              >
                {item.title}
              </Text>
            );
          }

          return (
            <TouchableOpacity
              testID={`watchlist-item-${item.entry.movie_id}`}
              onPress={() => handleMoviePress(item.entry.movie_id)}
              onLongPress={() => handleRemove(item.entry.movie_id)}
            >
              <MovieListItem
                entry={{
                  date: item.entry.movie.release_date,
                  movie: item.entry.movie,
                  dotType:
                    item.entry.movie.release_type === 'ott_original'
                      ? 'ott_original'
                      : 'theatrical',
                }}
              />
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
});
