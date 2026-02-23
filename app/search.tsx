import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/theme/colors';
import { useMovieSearch } from '@/features/movies/hooks/useMovieSearch';
import { Movie } from '@/types';

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT = 10;

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { data: results = [] } = useMovieSearch(query);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) setRecentSearches(JSON.parse(stored));
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={colors.white40} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies..."
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
        </View>
      )}

      {/* Results */}
      {hasQuery && (
        <FlashList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color={colors.white20} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>Try searching for another movie</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleMoviePress(item)}>
              <Image
                source={{ uri: item.poster_url ?? undefined }}
                style={styles.resultPoster}
                contentFit="cover"
              />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 56,
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
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.white },
  emptySubtitle: { fontSize: 14, color: colors.white60 },
});
