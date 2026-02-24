import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMoviesPaginated } from '@/features/movies/hooks/useMoviesPaginated';
import { usePlatforms, useMoviePlatformMap } from '@/features/ott/hooks';
import { useFilterStore } from '@/stores/useFilterStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Movie, ReleaseType } from '@/types';

const GENRES = [
  'Action',
  'Drama',
  'Comedy',
  'Romance',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Fantasy',
  'Crime',
  'Family',
  'Adventure',
  'Historical',
];

const SORT_OPTIONS = [
  { value: 'popular' as const, label: 'Popular' },
  { value: 'top_rated' as const, label: 'Rating' },
  { value: 'latest' as const, label: 'Latest' },
  { value: 'upcoming' as const, label: 'Upcoming' },
];

const FILTER_TABS = [
  { value: 'all' as const, label: 'All' },
  { value: 'theatrical' as const, label: 'Theaters' },
  { value: 'ott' as const, label: 'Streaming' },
  { value: 'upcoming' as const, label: 'Soon' },
];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string; platform?: string }>();

  const {
    selectedFilter,
    selectedGenres,
    selectedPlatforms,
    sortBy,
    searchQuery,
    setFilter,
    toggleGenre,
    togglePlatform,
    setSortBy,
    setSearchQuery,
    clearAll,
  } = useFilterStore();

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Apply URL params on mount
  useEffect(() => {
    if (params.filter) {
      setFilter(params.filter as 'all' | ReleaseType);
    }
    if (params.platform) {
      togglePlatform(params.platform);
    }
  }, []);

  const filters = useMemo(() => {
    const f: { releaseType?: ReleaseType; sortBy?: typeof sortBy } = {};
    if (selectedFilter !== 'all') f.releaseType = selectedFilter;
    f.sortBy = sortBy;
    return f;
  }, [selectedFilter, sortBy]);

  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useMoviesPaginated(filters);

  const allMovies = useMemo(() => data?.pages.flat() ?? [], [data]);
  const { data: platforms = [] } = usePlatforms();
  const movieIds = allMovies.map((m) => m.id);
  const { data: platformMap = {} } = useMoviePlatformMap(movieIds);

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

    return movies;
  }, [allMovies, searchQuery, selectedGenres, selectedPlatforms, platformMap]);

  const activeFilterCount = selectedGenres.length + selectedPlatforms.length;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderGridItem = ({ item }: { item: Movie }) => {
    const moviePlatforms = platformMap[item.id] ?? [];
    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => router.push(`/movie/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.gridPoster}>
          <Image
            source={{ uri: item.poster_url ?? undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={styles.gridBadgeLeft}>
            <StatusBadge type={item.release_type} />
          </View>
          {moviePlatforms.length > 0 && (
            <View style={styles.gridBadgeRight}>
              {moviePlatforms.slice(0, 2).map((p) => (
                <View key={p.id} style={[styles.gridPlatformIcon, { backgroundColor: p.color }]}>
                  <Text style={styles.gridPlatformText}>{p.logo}</Text>
                </View>
              ))}
            </View>
          )}
          {item.rating > 0 && (
            <View style={styles.gridRating}>
              <Ionicons name="star" size={12} color={colors.yellow400} />
              <Text style={styles.gridRatingText}>{item.rating}</Text>
            </View>
          )}
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.screenTitle}>Discover</Text>

        {/* Search Input */}
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={colors.white40} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies, genres, actors..."
            placeholderTextColor={colors.white40}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.white40} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Release Type Tabs */}
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

      {/* Filter + Sort Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="options" size={16} color={colors.white} />
          <Text style={styles.filterBarText}>Filters</Text>
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
          <Ionicons name="chevron-down" size={16} color={colors.white60} />
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown */}
      {showSortDropdown && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortOption, sortBy === opt.value && styles.sortOptionActive]}
              onPress={() => {
                setSortBy(opt.value);
                setShowSortDropdown(false);
              }}
            >
              <Text
                style={[styles.sortOptionText, sortBy === opt.value && styles.sortOptionTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Active Filter Pills */}
      {(selectedGenres.length > 0 || selectedPlatforms.length > 0) && (
        <View style={styles.activePills}>
          {selectedGenres.map((g) => (
            <TouchableOpacity key={g} style={styles.activePill} onPress={() => toggleGenre(g)}>
              <Text style={styles.activePillText}>{g}</Text>
              <Ionicons name="close" size={14} color={colors.red400} />
            </TouchableOpacity>
          ))}
          {selectedPlatforms.map((p) => {
            const platform = platforms.find((pl) => pl.id === p);
            return (
              <TouchableOpacity key={p} style={styles.activePill} onPress={() => togglePlatform(p)}>
                <Text style={styles.activePillText}>{platform?.name ?? p}</Text>
                <Ionicons name="close" size={14} color={colors.red400} />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.clearAllLink}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Movie Count */}
      {filteredMovies.length > 0 && (
        <View style={styles.movieCountRow}>
          <Text style={styles.movieCountText}>
            {filteredMovies.length} {filteredMovies.length === 1 ? 'movie' : 'movies'}
          </Text>
        </View>
      )}

      {/* Movie Grid */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.red600} />
        </View>
      ) : (
        <FlatList
          data={filteredMovies}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={filteredMovies.length > 0 ? styles.gridRow : undefined}
          contentContainerStyle={styles.gridContent}
          renderItem={renderGridItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState
              icon="film-outline"
              title="No movies found"
              subtitle="Try adjusting your filters or search terms"
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

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Platforms */}
              <Text style={styles.modalSectionTitle}>Streaming Platforms</Text>
              <View style={styles.platformGrid}>
                {platforms.map((p) => {
                  const isSelected = selectedPlatforms.includes(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.platformButton,
                        { backgroundColor: isSelected ? p.color : colors.white5 },
                      ]}
                      onPress={() => togglePlatform(p.id)}
                    >
                      <Text style={styles.platformLogo}>{p.logo}</Text>
                      <Text style={styles.platformName}>{p.name}</Text>
                      {isSelected && (
                        <View style={styles.platformCheck}>
                          <Ionicons name="checkmark" size={14} color={colors.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Genres */}
              <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>Genres</Text>
              <View style={styles.genreGrid}>
                {GENRES.map((g) => {
                  const isSelected = selectedGenres.includes(g);
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genrePill, isSelected && styles.genrePillActive]}
                      onPress={() => toggleGenre(g)}
                    >
                      <Text
                        style={[styles.genrePillText, isSelected && styles.genrePillTextActive]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={clearAll}>
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.showResultsButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.showResultsText}>Show {filteredMovies.length} Movies</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: colors.white },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.white5,
    alignItems: 'center',
  },
  tabButtonActive: { backgroundColor: colors.red600 },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: colors.white50 },
  tabButtonTextActive: { color: colors.white },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.white10,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.white10,
  },
  filterBarText: { color: colors.white, fontSize: 14, fontWeight: '500' },
  filterCountBadge: {
    backgroundColor: colors.red600,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  sortDropdown: {
    position: 'absolute',
    top: 165,
    right: 16,
    backgroundColor: colors.zinc900,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.white10,
    zIndex: 100,
  },
  sortOption: { paddingHorizontal: 16, paddingVertical: 10 },
  sortOptionActive: { backgroundColor: colors.red600 },
  sortOptionText: { color: colors.white60, fontSize: 14 },
  sortOptionTextActive: { color: colors.white },
  activePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.red600_20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activePillText: { color: colors.red400, fontSize: 13 },
  clearAllLink: { color: colors.red500, fontSize: 13, textDecorationLine: 'underline' },
  movieCountRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.white5,
  },
  movieCountText: {
    fontSize: 13,
    color: colors.white40,
  },
  gridContent: { paddingHorizontal: 16, paddingBottom: 100 },
  gridRow: { gap: 16, marginBottom: 16 },
  gridItem: { flex: 1 },
  gridPoster: {
    aspectRatio: 2 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gridBadgeLeft: { position: 'absolute', top: 10, left: 10 },
  gridBadgeRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
  },
  gridPlatformIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridPlatformText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  gridRating: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.black80,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gridRatingText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  gridTitle: { fontSize: 14, fontWeight: '600', color: colors.white },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.black95, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.zinc900,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  modalSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.white, marginBottom: 12 },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  platformButton: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  platformLogo: { fontSize: 18, fontWeight: '700', color: colors.white },
  platformName: { fontSize: 13, color: colors.white, flex: 1 },
  platformCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genrePill: {
    backgroundColor: colors.white10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  genrePillActive: { backgroundColor: colors.white },
  genrePillText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  genrePillTextActive: { color: colors.black, fontWeight: '700' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.white10,
  },
  clearFiltersText: { color: colors.white60, fontSize: 14 },
  showResultsButton: {
    backgroundColor: colors.red600,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  showResultsText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
