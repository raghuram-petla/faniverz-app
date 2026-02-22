import React from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useMoviesByMonth } from '@/features/movies/hooks/useMoviesByMonth';
import { useMovieSearch } from '@/features/movies/hooks/useMovieSearch';
import { useRecentOttReleases } from '@/features/ott/hooks';
import MovieCard from '@/components/movie/MovieCard';
import type { Movie } from '@/types/movie';

interface MovieSection {
  title: string;
  data: Movie[];
}

function getThisWeekRange(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function ExploreScreen() {
  const { colors } = useTheme();
  const now = React.useRef(new Date()).current;
  const [searchQuery, setSearchQuery] = React.useState('');
  const {
    data: searchResults = [],
    debouncedQuery,
    isLoading: isSearching,
  } = useMovieSearch(searchQuery);
  const {
    data: currentMonthEntries = [],
    isLoading,
    refetch,
  } = useMoviesByMonth(now.getFullYear(), now.getMonth());
  const { data: recentOtt = [] } = useRecentOttReleases();

  const isSearchMode = debouncedQuery.trim().length > 0;

  // Extract unique movies from calendar entries
  const allMovies = React.useMemo(() => {
    const movieMap = new Map<number, Movie>();
    for (const entry of currentMonthEntries) {
      movieMap.set(entry.movie.id, entry.movie);
    }
    return Array.from(movieMap.values());
  }, [currentMonthEntries]);

  const sections = React.useMemo((): MovieSection[] => {
    const todayStr = formatDate(now);
    const { start: weekStart, end: weekEnd } = getThisWeekRange();
    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(weekEnd);

    const thisWeek = allMovies.filter(
      (m) => m.release_date >= weekStartStr && m.release_date <= weekEndStr
    );
    const comingSoon = allMovies.filter(
      (m) => m.release_date > todayStr && m.status === 'upcoming'
    );
    const nowInTheaters = allMovies.filter(
      (m) =>
        m.release_date <= todayStr && m.release_type === 'theatrical' && m.status === 'released'
    );

    const newOnOtt = recentOtt.map((entry) => entry.movie);

    const result: MovieSection[] = [];
    if (thisWeek.length > 0) result.push({ title: 'This Week', data: thisWeek });
    if (comingSoon.length > 0) result.push({ title: 'Coming Soon', data: comingSoon });
    if (nowInTheaters.length > 0) result.push({ title: 'Now in Theaters', data: nowInTheaters });
    if (newOnOtt.length > 0) result.push({ title: 'New on OTT', data: newOnOtt });

    return result;
  }, [allMovies, now, recentOtt]);

  const renderSection = ({ item }: { item: MovieSection }) => (
    <View style={styles.section}>
      <Text testID={`section-${item.title}`} style={[styles.sectionTitle, { color: colors.text }]}>
        {item.title}
      </Text>
      <FlatList
        horizontal
        data={item.data}
        keyExtractor={(movie) => String(movie.id)}
        renderItem={({ item: movie }) => <MovieCard movie={movie} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View testID="explore-screen" style={styles.container}>
        <Text style={[styles.header, { color: colors.text }]}>Explore</Text>
        <View style={styles.searchContainer}>
          <TextInput
            testID="search-input"
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Search movies..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              testID="search-clear"
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={[styles.clearText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {isSearchMode ? (
          <FlatList
            testID="search-results"
            data={searchResults}
            keyExtractor={(movie) => String(movie.id)}
            numColumns={2}
            columnWrapperStyle={styles.searchGrid}
            renderItem={({ item: movie }) => <MovieCard movie={movie} />}
            contentContainerStyle={styles.searchContent}
            ListEmptyComponent={
              <Text testID="search-empty" style={[styles.empty, { color: colors.textTertiary }]}>
                {isSearching ? 'Searching...' : 'No movies found'}
              </Text>
            }
          />
        ) : (
          <FlatList
            testID="explore-sections"
            data={sections}
            keyExtractor={(section) => section.title}
            renderItem={renderSection}
            refreshControl={
              <RefreshControl
                testID="refresh-control"
                refreshing={isLoading}
                onRefresh={() => refetch()}
              />
            }
            ListEmptyComponent={
              <Text testID="explore-empty" style={[styles.empty, { color: colors.textTertiary }]}>
                {isLoading ? 'Loading movies...' : 'No movies to explore'}
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  clearButton: {
    position: 'absolute',
    right: 24,
    padding: 4,
  },
  clearText: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  searchContent: {
    paddingHorizontal: 16,
  },
  searchGrid: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 48,
    fontSize: 16,
  },
});
