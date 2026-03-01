import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/theme/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMovieSearch } from '@/features/movies/hooks/useMovieSearch';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { useMoviePlatformMap } from '@/features/ott/hooks';
import { Movie } from '@/types';
import { STORAGE_KEYS } from '@/constants/storage';

const RECENT_SEARCHES_KEY = STORAGE_KEYS.RECENT_SEARCHES;
const MAX_RECENT = 10;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { data: results = [] } = useMovieSearch(query);
  const { data: allMovies = [] } = useMovies();
  const trendingMovies = useMemo(
    () => [...allMovies].sort((a, b) => b.rating - a.rating).slice(0, 5),
    [allMovies],
  );
  const resultIds = results.map((m) => m.id);
  const { data: platformMap = {} } = useMoviePlatformMap(resultIds);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        /* ignore corrupted data */
      }
    }
  };

  const saveSearch = async (term: string) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const removeSearch = async (term: string) => {
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handleMoviePress = (movie: Movie) => {
    if (query.length >= 2) saveSearch(query);
    router.push(`/movie/${movie.id}`);
  };

  const hasQuery = query.length >= 2;

  return (
    <View style={styles.screen}>
      <View style={[styles.safeAreaCover, { height: insets.top }]} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={colors.white40} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies, actors, directors..."
            placeholderTextColor={colors.white40}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.white40} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* No query — show recent searches */}
      {!hasQuery && (
        <View style={styles.noQuery}>
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearSearches}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.recentPills}>
                {recentSearches.map((term) => (
                  <View key={term} style={styles.recentPill}>
                    <TouchableOpacity
                      onPress={() => setQuery(term)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Ionicons name="time-outline" size={14} color={colors.white40} />
                      <Text style={styles.recentPillText}>{term}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeSearch(term)}>
                      <Ionicons name="close" size={14} color={colors.white40} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Trending Now */}
          {trendingMovies.length > 0 && (
            <View style={styles.trendingSection}>
              <View style={styles.trendingHeader}>
                <Ionicons name="trending-up" size={20} color={colors.red500} />
                <Text style={styles.trendingTitle}>Trending Now</Text>
              </View>
              {trendingMovies.map((movie, index) => (
                <TouchableOpacity
                  key={movie.id}
                  style={styles.trendingItem}
                  onPress={() => handleMoviePress(movie)}
                >
                  <View style={styles.trendingRank}>
                    <Text style={styles.trendingRankText}>{index + 1}</Text>
                  </View>
                  <Image
                    source={{ uri: movie.poster_url ?? undefined }}
                    style={styles.trendingPoster}
                    contentFit="cover"
                  />
                  <View style={styles.trendingInfo}>
                    <Text style={styles.trendingMovieTitle} numberOfLines={1}>
                      {movie.title}
                    </Text>
                    <View style={styles.trendingMeta}>
                      <Ionicons name="star" size={12} color={colors.yellow400} />
                      <Text style={styles.trendingRating}>{movie.rating}</Text>
                      <Text style={styles.trendingDot}>•</Text>
                      <Text style={styles.trendingReviews}>{movie.review_count} reviews</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Results */}
      {hasQuery && results.length > 0 && (
        <Text style={styles.resultsCount}>
          {results.length} result{results.length !== 1 ? 's' : ''} found
        </Text>
      )}
      {hasQuery && (
        <FlashList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title="No results found"
              subtitle="Try searching for another movie"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleMoviePress(item)}>
              <View>
                <Image
                  source={{ uri: item.poster_url ?? undefined }}
                  style={styles.resultPoster}
                  contentFit="cover"
                />
                {platformMap[item.id]?.length > 0 && (
                  <View
                    style={[
                      styles.platformBadge,
                      { backgroundColor: platformMap[item.id][0].color },
                    ]}
                  >
                    <Text style={styles.platformBadgeText}>{platformMap[item.id][0].logo}</Text>
                  </View>
                )}
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.resultMeta}>
                  <View
                    style={[
                      styles.resultBadge,
                      {
                        backgroundColor:
                          item.release_type === 'theatrical'
                            ? colors.red600
                            : item.release_type === 'ott'
                              ? colors.purple600
                              : colors.blue600,
                      },
                    ]}
                  >
                    <Text style={styles.resultBadgeText}>
                      {item.release_type === 'theatrical'
                        ? 'In Theaters'
                        : item.release_type === 'ott'
                          ? 'Streaming'
                          : 'Upcoming'}
                    </Text>
                  </View>
                  {item.rating > 0 && (
                    <View style={styles.resultRating}>
                      <Ionicons name="star" size={12} color={colors.yellow400} />
                      <Text style={styles.resultRatingText}>{item.rating}</Text>
                    </View>
                  )}
                </View>
                {item.director && <Text style={styles.resultDirector}>{item.director}</Text>}
                {item.genres.length > 0 && (
                  <Text style={styles.resultGenres} numberOfLines={1}>
                    {item.genres.join(' • ')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  safeAreaCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.white },
  cancelText: { color: colors.white60, fontSize: 16 },
  noQuery: { paddingHorizontal: 16, paddingTop: 16 },
  recentSection: { marginBottom: 32 },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: { fontSize: 16, fontWeight: '600', color: colors.white },
  clearText: { color: colors.red500, fontSize: 14 },
  recentPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recentPillText: { color: colors.white, fontSize: 14 },
  resultsCount: {
    fontSize: 14,
    color: colors.white60,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  resultsList: { paddingHorizontal: 16, paddingBottom: 100 },
  resultItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.white5,
  },
  resultPoster: { width: 64, height: 96, borderRadius: 8 },
  resultInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  resultTitle: { fontSize: 16, fontWeight: '600', color: colors.white },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  resultRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultRatingText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  resultDirector: { fontSize: 13, color: colors.white60 },
  resultGenres: { fontSize: 12, color: colors.white50 },
  trendingSection: { marginTop: 24 },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  trendingTitle: { fontSize: 16, fontWeight: '600', color: colors.white },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  trendingRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingRankText: { fontSize: 13, fontWeight: '700', color: colors.red500 },
  trendingPoster: { width: 48, height: 72, borderRadius: 8 },
  trendingInfo: { flex: 1, gap: 4 },
  trendingMovieTitle: { fontSize: 15, fontWeight: '600', color: colors.white },
  trendingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendingRating: { fontSize: 12, color: colors.white60 },
  trendingDot: { fontSize: 12, color: colors.white40 },
  trendingReviews: { fontSize: 12, color: colors.white60 },
  platformBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
});
