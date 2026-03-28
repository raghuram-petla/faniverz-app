import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
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
import { DiscoverFilterModal } from '@/components/discover/DiscoverFilterModal';
import { DiscoverGridItem } from '@/components/discover/DiscoverGridItem';
import { DiscoverSearchHeader } from '@/components/discover/DiscoverSearchHeader';
import { ActiveFilterPills } from '@/components/discover/ActiveFilterPills';
import { DiscoverFilterBar } from '@/components/discover/DiscoverFilterBar';
import { SortDropdown } from '@/components/discover/SortDropdown';
import { DiscoverContentSkeleton } from '@/components/discover/DiscoverContentSkeleton';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSmartPagination } from '@/hooks/useSmartPagination';
import { DISCOVER_PAGINATION } from '@/constants/paginationConfig';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

// @boundary: Discover screen — paginated movie grid with deep-link support for filter/platform params
// @coupling: useFilterStore (Zustand), useMoviesPaginated, useMoviePlatformMap, useProductionHouses
export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
  }, [showSortDropdown, animationsEnabled]); // chevronRotate is a SharedValue (stable ref)
  /* istanbul ignore next -- Reanimated worklet cannot execute in Jest */
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotate.value}deg` }],
  }));

  // @sideeffect: applies deep-link params when they change (supports re-navigation with different params)
  // @assumes: params.filter is a valid MovieStatus or 'all'
  // @edge: only togglePlatform if not already selected — prevents toggling OFF on re-mount when Zustand persists
  useEffect(() => {
    if (params.filter) setFilter(params.filter as 'all' | MovieStatus);
    if (params.platform && !useFilterStore.getState().selectedPlatforms.includes(params.platform)) {
      togglePlatform(params.platform);
    }
  }, [params.filter, params.platform, setFilter, togglePlatform]);

  // @contract: only movieStatus and sortBy are sent to the API; genre/platform/PH filtering is client-side
  const filters = useMemo(
    () => ({
      ...(selectedFilter !== 'all' && { movieStatus: selectedFilter }),
      sortBy,
    }),
    [selectedFilter, sortBy],
  );

  const {
    allItems: allMovies,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useMoviesPaginated(filters);

  const { refreshing, onRefresh } = useRefresh(refetch);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);
  /* istanbul ignore next */
  const { data: platforms = [] } = usePlatforms();
  /* istanbul ignore next */
  const { data: productionHouses = [] } = useProductionHouses();
  const movieIds = useMemo(() => allMovies.map((m) => m.id), [allMovies]);
  /* istanbul ignore next */
  const { data: platformMap = {} } = useMoviePlatformMap(movieIds);
  // @coupling: useMovieIdsByProductionHouse returns movie IDs from the production_house_movies junction table
  /* istanbul ignore next */
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

  const { handleEndReached, onEndReachedThreshold } = useSmartPagination({
    totalItems: allMovies.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    config: DISCOVER_PAGINATION,
  });

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

      <DiscoverFilterBar
        theme={theme}
        styles={styles}
        activeFilterCount={activeFilterCount}
        sortBy={sortBy}
        chevronStyle={chevronStyle}
        onOpenFilterModal={() => setShowFilterModal(true)}
        onToggleSortDropdown={() => setShowSortDropdown(!showSortDropdown)}
      />

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
          onEndReachedThreshold={onEndReachedThreshold}
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
