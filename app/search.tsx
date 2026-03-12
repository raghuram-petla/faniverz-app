import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { HomeButton } from '@/components/common/HomeButton';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { useUniversalSearch } from '@/features/search';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { useMoviePlatformMap } from '@/features/ott/hooks';
import { Movie } from '@/types';
import { STORAGE_KEYS } from '@/constants/storage';
import { createStyles } from '@/styles/search.styles';
import { SearchResultActor } from '@/components/search/SearchResultActor';
import { SearchResultProductionHouse } from '@/components/search/SearchResultProductionHouse';
import { SearchResultMovie } from '@/components/search/SearchResultMovie';
import { TrendingMovies } from '@/components/search/TrendingMovies';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const RECENT_SEARCHES_KEY = STORAGE_KEYS.RECENT_SEARCHES;
const MAX_RECENT = 10;

type SearchFilter = 'all' | 'movies' | 'actors' | 'studios';

export default function SearchScreen() {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
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
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);

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
    { key: 'all', label: t('common.all') },
    { key: 'movies', label: `${t('search.movies')}${movies.length ? ` (${movies.length})` : ''}` },
    { key: 'actors', label: `${t('search.actors')}${actors.length ? ` (${actors.length})` : ''}` },
    {
      key: 'studios',
      label: `${t('search.studios')}${productionHouses.length ? ` (${productionHouses.length})` : ''}`,
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
            placeholder={t('search.placeholder')}
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
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
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
                <Text style={styles.recentTitle}>{t('search.recentSearches')}</Text>
                <TouchableOpacity onPress={clearSearches}>
                  <Text style={styles.clearText}>{t('search.clear')}</Text>
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
          <TrendingMovies movies={trendingMovies} onMoviePress={handleMoviePress} />
        </View>
      )}

      {hasQuery && totalResults > 0 && (
        <Text style={styles.resultsCount}>
          {totalResults === 1
            ? t('search.resultFound', { count: totalResults })
            : t('search.resultsFound', { count: totalResults })}
        </Text>
      )}
      {hasQuery && (
        <FlashList
          data={filteredMovies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          onScroll={handlePullScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
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
                title={t('common.noResults')}
                subtitle={t('search.tryDifferent')}
              />
            ) : null
          }
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index} direction="right" distance={20} stagger={50}>
              <SearchResultMovie
                movie={item}
                platforms={platformMap[item.id] ?? []}
                onPress={() => handleMoviePress(item)}
              />
            </AnimatedListItem>
          )}
        />
      )}
    </View>
  );
}
