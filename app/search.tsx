import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMovieSearch } from '@/features/movies/hooks/useMovieSearch';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { useMoviePlatformMap } from '@/features/ott/hooks';
import { Movie } from '@/types';
import { STORAGE_KEYS } from '@/constants/storage';
import { deriveMovieStatus } from '@shared/movieStatus';
import { getMovieStatusLabel, getMovieStatusColor } from '@/constants';
import { createStyles } from '@/styles/search.styles';
import { getImageUrl } from '@shared/imageUrl';

const RECENT_SEARCHES_KEY = STORAGE_KEYS.RECENT_SEARCHES;
const MAX_RECENT = 10;

export default function SearchScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
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
          <Ionicons name="search" size={18} color={theme.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies, actors, directors..."
            placeholderTextColor={theme.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
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
                      <Ionicons name="time-outline" size={14} color={theme.textTertiary} />
                      <Text style={styles.recentPillText}>{term}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeSearch(term)}>
                      <Ionicons name="close" size={14} color={theme.textTertiary} />
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
                    source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? undefined }}
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
          renderItem={({ item }) => {
            const itemPlatforms = platformMap[item.id] ?? [];
            const status = deriveMovieStatus(item, itemPlatforms.length);
            return (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleMoviePress(item)}>
                <View>
                  <Image
                    source={{ uri: getImageUrl(item.poster_url, 'sm') ?? undefined }}
                    style={styles.resultPoster}
                    contentFit="cover"
                  />
                  {itemPlatforms.length > 0 && (
                    <View
                      style={[styles.platformBadge, { backgroundColor: itemPlatforms[0].color }]}
                    >
                      <Text style={styles.platformBadgeText}>{itemPlatforms[0].logo}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.resultMeta}>
                    <View
                      style={[styles.resultBadge, { backgroundColor: getMovieStatusColor(status) }]}
                    >
                      <Text style={styles.resultBadgeText}>{getMovieStatusLabel(status)}</Text>
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
            );
          }}
        />
      )}
    </View>
  );
}
