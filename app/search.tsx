import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HomeButton } from '@/components/common/HomeButton';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUniversalSearch } from '@/features/search';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { useMoviePlatformMap } from '@/features/ott/hooks';
import { Movie } from '@/types';
import { STORAGE_KEYS } from '@/constants/storage';
import { createStyles } from '@/styles/search.styles';
import { getImageUrl } from '@shared/imageUrl';
import { SearchResultActor } from '@/components/search/SearchResultActor';
import { SearchResultProductionHouse } from '@/components/search/SearchResultProductionHouse';
import { SearchResultMovie } from '@/components/search/SearchResultMovie';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const RECENT_SEARCHES_KEY = STORAGE_KEYS.RECENT_SEARCHES;
const MAX_RECENT = 10;

type SearchFilter = 'all' | 'movies' | 'actors' | 'studios';

export default function SearchScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { data: searchResults, refetch: refetchResults } = useUniversalSearch(query);
  const movies = searchResults?.movies ?? [];
  const actors = searchResults?.actors ?? [];
  const productionHouses = searchResults?.productionHouses ?? [];

  const { data: allMovies = [], refetch: refetchMovies } = useMovies();
  const trendingMovies = useMemo(
    () => [...allMovies].sort((a, b) => b.rating - a.rating).slice(0, 5),
    [allMovies],
  );
  const resultIds = movies.map((m) => m.id);
  const { data: platformMap = {} } = useMoviePlatformMap(resultIds);
  const { refreshing, onRefresh } = useRefresh(async () => {
    await refetchResults();
  }, refetchMovies);
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
  );

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        /* ignore */
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
  const filteredMovies = filter === 'all' || filter === 'movies' ? movies : [];
  const filteredActors = filter === 'all' || filter === 'actors' ? actors : [];
  const filteredHouses = filter === 'all' || filter === 'studios' ? productionHouses : [];
  const totalResults = filteredMovies.length + filteredActors.length + filteredHouses.length;

  const FILTERS: { key: SearchFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'movies', label: `Movies${movies.length ? ` (${movies.length})` : ''}` },
    { key: 'actors', label: `Actors${actors.length ? ` (${actors.length})` : ''}` },
    {
      key: 'studios',
      label: `Studios${productionHouses.length ? ` (${productionHouses.length})` : ''}`,
    },
  ];

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <HomeButton />
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={theme.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies, actors, studios..."
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

      {/* Filter chips */}
      {hasQuery && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
                    <TouchableOpacity onPress={() => setQuery(term)} style={styles.recentPillInner}>
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

      {hasQuery && totalResults > 0 && (
        <Text style={styles.resultsCount}>
          {totalResults} result{totalResults !== 1 ? 's' : ''} found
        </Text>
      )}
      {hasQuery && (
        <FlashList
          data={filteredMovies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          onScroll={handlePullScroll}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <View>
              <PullToRefreshIndicator
                pullDistance={pullDistance}
                isRefreshing={isRefreshing}
                refreshing={refreshing}
              />
              {filteredActors.map((actor) => (
                <SearchResultActor
                  key={actor.id}
                  actor={actor}
                  onPress={() => {
                    if (query.length >= 2) saveSearch(query);
                    router.push(`/actor/${actor.id}`);
                  }}
                />
              ))}
              {filteredHouses.map((house) => (
                <SearchResultProductionHouse
                  key={house.id}
                  house={house}
                  onPress={() => {
                    if (query.length >= 2) saveSearch(query);
                    router.push(`/production-house/${house.id}`);
                  }}
                />
              ))}
              {(filteredActors.length > 0 || filteredHouses.length > 0) &&
                filteredMovies.length > 0 && <View style={styles.sectionDivider} />}
            </View>
          }
          ListEmptyComponent={
            filteredActors.length === 0 && filteredHouses.length === 0 ? (
              <EmptyState
                icon="search"
                title="No results found"
                subtitle="Try a different search term"
              />
            ) : null
          }
          renderItem={({ item }) => (
            <SearchResultMovie
              movie={item}
              platforms={platformMap[item.id] ?? []}
              onPress={() => handleMoviePress(item)}
            />
          )}
        />
      )}
    </View>
  );
}
