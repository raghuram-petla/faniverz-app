import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { createStyles } from '@/styles/discover.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMoviesPaginated } from '@/features/movies/hooks/useMoviesPaginated';
import { usePlatforms, useMoviePlatformMap } from '@/features/ott/hooks';
import { useFilterStore } from '@/stores/useFilterStore';
import { Movie, MovieStatus } from '@/types';
import {
  useProductionHouses,
  useMovieIdsByProductionHouse,
} from '@/features/productionHouses/hooks';
import {
  DiscoverFilterModal,
  SORT_OPTIONS,
  FILTER_TABS,
} from '@/components/discover/DiscoverFilterModal';
import { DiscoverGridItem } from '@/components/discover/DiscoverGridItem';
import { ActiveFilterPills } from '@/components/discover/ActiveFilterPills';
import { SortDropdown } from '@/components/discover/SortDropdown';
import { HomeButton } from '@/components/common/HomeButton';
import { LoadingCenter } from '@/components/common/LoadingCenter';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string; platform?: string }>();

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

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  useEffect(() => {
    if (params.filter) {
      setFilter(params.filter as 'all' | MovieStatus);
    }
    if (params.platform) {
      togglePlatform(params.platform);
    }
  }, []);

  const filters = useMemo(() => {
    const f: { movieStatus?: MovieStatus; sortBy?: typeof sortBy } = {};
    if (selectedFilter !== 'all') f.movieStatus = selectedFilter;
    f.sortBy = sortBy;
    return f;
  }, [selectedFilter, sortBy]);

  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading, refetch } =
    useMoviesPaginated(filters);

  const { refreshing, onRefresh } = useRefresh(refetch);
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
  );

  const allMovies = useMemo(() => data?.pages.flat() ?? [], [data]);
  const { data: platforms = [] } = usePlatforms();
  const { data: productionHouses = [] } = useProductionHouses();
  const movieIds = allMovies.map((m) => m.id);
  const { data: platformMap = {} } = useMoviePlatformMap(movieIds);
  const { data: phMovieIds = [] } = useMovieIdsByProductionHouse(selectedProductionHouses);

  const filteredMovies = useMemo(() => {
    let movies = allMovies;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      movies = movies.filter(
        (m) => m.title.toLowerCase().includes(q) || m.director?.toLowerCase().includes(q),
      );
    }

    if (selectedGenres.length > 0) {
      movies = movies.filter((m) => selectedGenres.some((g) => m.genres.includes(g)));
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

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <HomeButton />
          <Text style={styles.screenTitle}>{t('discover.title')}</Text>
        </View>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={theme.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('discover.searchPlaceholder')}
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tabButton, selectedFilter === tab.value && styles.tabButtonActive]}
            onPress={() => setFilter(tab.value)}
          >
            <Text
              style={[
                styles.tabButtonText,
                selectedFilter === tab.value && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
          <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
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
        <LoadingCenter />
      ) : (
        <FlatList
          data={filteredMovies}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={filteredMovies.length > 0 ? styles.gridRow : undefined}
          contentContainerStyle={styles.gridContent}
          onScroll={handlePullScroll}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <PullToRefreshIndicator
              pullDistance={pullDistance}
              isRefreshing={isRefreshing}
              refreshing={refreshing}
            />
          }
          renderItem={({ item }: { item: Movie }) => (
            <DiscoverGridItem item={item} platforms={platformMap[item.id] ?? []} styles={styles} />
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
