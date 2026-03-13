import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { createStyles } from '@/styles/discover.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { useMoviesPaginated } from '@/features/movies/hooks/useMoviesPaginated';
import { usePlatforms, useMoviePlatformMap } from '@/features/ott/hooks';
import { useFilterStore } from '@/stores/useFilterStore';
import { Movie, MovieStatus } from '@/types';
import {
  useProductionHouses,
  useMovieIdsByProductionHouse,
} from '@/features/productionHouses/hooks';
import { DiscoverFilterModal, SORT_OPTIONS } from '@/components/discover/DiscoverFilterModal';
import { DiscoverGridItem } from '@/components/discover/DiscoverGridItem';
import { DiscoverSearchHeader } from '@/components/discover/DiscoverSearchHeader';
import { ActiveFilterPills } from '@/components/discover/ActiveFilterPills';
import { SortDropdown } from '@/components/discover/SortDropdown';
import { DiscoverContentSkeleton } from '@/components/discover/DiscoverContentSkeleton';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

// @boundary: Discover screen — paginated movie grid with deep-link support for filter/platform params
// @coupling: useFilterStore (Zustand), useMoviesPaginated, useMoviePlatformMap, useProductionHouses
export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // @boundary: deep-link params — filter/platform may arrive from home screen shortcuts
  const params = useLocalSearchParams<{ filter?: string; platform?: string }>();

  // @coupling: useFilterStore — global Zustand store shared with DiscoverFilterModal
  const {
    selectedFilter,
    selectedGenres,
    selectedPlatforms,
    selectedProductionHouses,
    sortBy,
    searchQuery,
    setFilter,
    toggleGenre,
    togglePlatform,
    toggleProductionHouse,
    setSortBy,
    setSearchQuery,
    clearAll,
  } = useFilterStore();

  const animationsEnabled = useAnimationsEnabled();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const chevronRotate = useSharedValue(0);
  useEffect(() => {
    const deg = showSortDropdown ? 180 : 0;
    chevronRotate.value = animationsEnabled ? withTiming(deg, { duration: 200 }) : deg;
  }, [showSortDropdown, chevronRotate, animationsEnabled]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotate.value}deg` }],
  }));

  // @sideeffect: applies deep-link params on mount only (empty deps intentional)
  // @assumes: params.filter is a valid MovieStatus or 'all'
  useEffect(() => {
    if (params.filter) setFilter(params.filter as 'all' | MovieStatus);
    if (params.platform) togglePlatform(params.platform);
  }, []);

  // @contract: only movieStatus and sortBy are sent to the API; genre/platform/PH filtering is client-side
  const filters = useMemo(
    () => ({
      ...(selectedFilter !== 'all' && { movieStatus: selectedFilter }),
      sortBy,
    }),
    [selectedFilter, sortBy],
  );

  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading, refetch } =
    useMoviesPaginated(filters);

  const { refreshing, onRefresh } = useRefresh(refetch);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);

  const allMovies = useMemo(() => data?.pages.flat() ?? [], [data]);
  const { data: platforms = [] } = usePlatforms();
  const { data: productionHouses = [] } = useProductionHouses();
  const movieIds = useMemo(() => allMovies.map((m) => m.id), [allMovies]);
  const { data: platformMap = {} } = useMoviePlatformMap(movieIds);
  // @coupling: useMovieIdsByProductionHouse returns movie IDs from the production_house_movies junction table
  const { data: phMovieIds = [] } = useMovieIdsByProductionHouse(selectedProductionHouses);

  // @invariant: all filtering (search, genre, platform, PH) happens client-side on already-fetched pages
  // @nullable: m.director and m.genres may be null — guarded with ?.toLowerCase() and ?? []
  const filteredMovies = useMemo(() => {
    let movies = allMovies;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      movies = movies.filter(
        (m) => m.title.toLowerCase().includes(q) || m.director?.toLowerCase().includes(q),
      );
    }

    if (selectedGenres.length > 0) {
      movies = movies.filter((m) => selectedGenres.some((g) => (m.genres ?? []).includes(g)));
    }

    if (selectedPlatforms.length > 0) {
      movies = movies.filter((m) => {
        const mp = platformMap[m.id] ?? [];
        return mp.some((p) => selectedPlatforms.includes(p.id));
      });
    }

    if (selectedProductionHouses.length > 0) {
      movies = movies.filter((m) => phMovieIds.includes(m.id));
    }

    return movies;
  }, [
    allMovies,
    searchQuery,
    selectedGenres,
    selectedPlatforms,
    platformMap,
    selectedProductionHouses,
    phMovieIds,
  ]);

  const activeFilterCount =
    selectedGenres.length + selectedPlatforms.length + selectedProductionHouses.length;

  // @edge: guard against double-fetch when already loading the next page
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      <DiscoverSearchHeader
        insetTop={insets.top}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedFilter={selectedFilter}
        onFilterChange={setFilter}
        onBack={() => router.back()}
      />

      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="options" size={16} color={theme.textPrimary} />
          <Text style={styles.filterBarText}>{t('discover.filters')}</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortDropdown(!showSortDropdown)}
        >
          <Text style={styles.filterBarText}>
            {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
          </Text>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <SortDropdown
        visible={showSortDropdown}
        sortBy={sortBy}
        onSelectSort={(value) => {
          setSortBy(value);
          setShowSortDropdown(false);
        }}
        styles={styles}
      />

      <ActiveFilterPills
        selectedGenres={selectedGenres}
        selectedPlatforms={selectedPlatforms}
        selectedProductionHouses={selectedProductionHouses}
        platforms={platforms}
        productionHouses={productionHouses}
        onToggleGenre={toggleGenre}
        onTogglePlatform={togglePlatform}
        onToggleProductionHouse={toggleProductionHouse}
        onClearAll={clearAll}
        styles={styles}
      />

      {filteredMovies.length > 0 && (
        <View style={styles.movieCountRow}>
          <Text style={styles.movieCountText}>
            {filteredMovies.length}{' '}
            {filteredMovies.length === 1 ? t('discover.movie') : t('discover.movies')}
          </Text>
        </View>
      )}

      {isLoading ? (
        <DiscoverContentSkeleton />
      ) : (
        <FlatList
          data={filteredMovies}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={filteredMovies.length > 0 ? styles.gridRow : undefined}
          contentContainerStyle={styles.gridContent}
          onScroll={handlePullScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <PullToRefreshIndicator
              pullDistance={pullDistance}
              isRefreshing={isRefreshing}
              refreshing={refreshing}
            />
          }
          renderItem={({ item, index }: { item: Movie; index: number }) => (
            <AnimatedListItem index={index} stagger={50}>
              <DiscoverGridItem
                item={item}
                platforms={platformMap[item.id] ?? []}
                styles={styles}
              />
            </AnimatedListItem>
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState
              icon="film-outline"
              title={t('discover.noMovies')}
              subtitle={t('discover.noMoviesSubtitle')}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.red600} />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <DiscoverFilterModal
        visible={showFilterModal}
        platforms={platforms}
        productionHouses={productionHouses}
        selectedPlatforms={selectedPlatforms}
        selectedGenres={selectedGenres}
        selectedProductionHouses={selectedProductionHouses}
        filteredCount={filteredMovies.length}
        onTogglePlatform={togglePlatform}
        onToggleGenre={toggleGenre}
        onToggleProductionHouse={toggleProductionHouse}
        onClearAll={clearAll}
        onClose={() => setShowFilterModal(false)}
        styles={styles}
      />
    </View>
  );
}
