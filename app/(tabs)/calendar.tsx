import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useUpcomingMovies } from '@/features/movies/hooks/useUpcomingMovies';
import { useMoviePlatformMap } from '@/features/ott/hooks';
import { MovieListItem } from '@/components/movie/MovieListItem';
import { Movie } from '@/types';
import { useCalendarStore } from '@/stores/useCalendarStore';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } = useUpcomingMovies();

  const allMovies = useMemo(() => data?.pages.flat() ?? [], [data]);
  const movieIds = allMovies.map((m) => m.id);
  const { data: platformMap = {} } = useMoviePlatformMap(movieIds);

  const {
    selectedYear,
    selectedMonth,
    selectedDay,
    showFilters,
    hasUserFiltered,
    setDate,
    toggleFilters,
    clearFilters,
  } = useCalendarStore();
  const [showYearPicker, setShowYearPicker] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filteredMovies = useMemo(() => {
    if (!hasUserFiltered) return allMovies;
    return allMovies.filter((movie) => {
      const d = new Date(movie.release_date);
      if (selectedYear !== null && d.getFullYear() !== selectedYear) return false;
      if (selectedMonth !== null && d.getMonth() !== selectedMonth) return false;
      if (selectedDay !== null && d.getDate() !== selectedDay) return false;
      return true;
    });
  }, [allMovies, hasUserFiltered, selectedYear, selectedMonth, selectedDay]);

  const groupedMovies = useMemo(() => {
    const groups: { date: string; movies: Movie[]; movieDate: Date }[] = [];
    const map = new Map<string, Movie[]>();

    for (const movie of filteredMovies) {
      const key = movie.release_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(movie);
    }

    for (const [dateStr, movies] of map) {
      groups.push({ date: dateStr, movies, movieDate: new Date(dateStr) });
    }

    return groups;
  }, [filteredMovies]);

  const years = useMemo(
    () =>
      Array.from(new Set(allMovies.map((m) => new Date(m.release_date).getFullYear()))).sort(
        (a, b) => b - a,
      ),
    [allMovies],
  );

  const hasActiveFilters = hasUserFiltered;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.red600} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.safeAreaCover, { height: insets.top }]} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Release Calendar</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={toggleFilters}
          accessibilityRole="button"
          accessibilityLabel="Toggle filters"
        >
          <Ionicons name="options-outline" size={20} color={colors.white} />
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <View style={styles.filterPills}>
          {selectedYear !== null && (
            <FilterPill
              label={String(selectedYear)}
              onRemove={() => setDate(null, selectedMonth, selectedDay)}
            />
          )}
          {selectedMonth !== null && (
            <FilterPill
              label={MONTHS[selectedMonth]}
              onRemove={() => setDate(selectedYear, null, selectedDay)}
            />
          )}
          {selectedDay !== null && (
            <FilterPill
              label={`Day ${selectedDay}`}
              onRemove={() => setDate(selectedYear, selectedMonth, null)}
            />
          )}
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearAll}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          {/* Year */}
          <Text style={styles.filterLabel}>Year</Text>
          <TouchableOpacity
            style={[styles.yearButton, selectedYear !== null && styles.yearButtonActive]}
            onPress={() => setShowYearPicker(!showYearPicker)}
          >
            <Text
              style={[styles.yearButtonText, selectedYear !== null && styles.yearButtonTextActive]}
            >
              {selectedYear !== null ? selectedYear : 'All Years'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.white60} />
          </TouchableOpacity>
          {showYearPicker && (
            <ScrollView style={styles.yearDropdown} nestedScrollEnabled>
              <TouchableOpacity
                style={[styles.yearOption, selectedYear === null && styles.yearOptionActive]}
                onPress={() => {
                  setDate(null, selectedMonth, selectedDay);
                  setShowYearPicker(false);
                }}
              >
                <Text style={styles.yearOptionText}>All Years</Text>
              </TouchableOpacity>
              {years.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearOption, selectedYear === y && styles.yearOptionActive]}
                  onPress={() => {
                    setDate(y, selectedMonth, selectedDay);
                    setShowYearPicker(false);
                  }}
                >
                  <Text style={styles.yearOptionText}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Month */}
          <Text style={[styles.filterLabel, { marginTop: 16 }]}>Month</Text>
          <View style={styles.monthGrid}>
            {MONTHS.map((month, i) => (
              <TouchableOpacity
                key={month}
                style={[styles.monthButton, selectedMonth === i && styles.monthButtonActive]}
                onPress={() => setDate(selectedYear, selectedMonth === i ? null : i, selectedDay)}
              >
                <Text
                  style={[
                    styles.monthButtonText,
                    selectedMonth === i && styles.monthButtonTextActive,
                  ]}
                >
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Day */}
          <Text style={[styles.filterLabel, { marginTop: 16 }]}>Day</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayScroll}
          >
            {Array.from(
              {
                length:
                  selectedMonth !== null && selectedYear !== null
                    ? new Date(selectedYear, selectedMonth + 1, 0).getDate()
                    : selectedMonth !== null
                      ? new Date(new Date().getFullYear(), selectedMonth + 1, 0).getDate()
                      : 31,
              },
              (_, i) => i + 1,
            ).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.dayButton, selectedDay === d && styles.monthButtonActive]}
                onPress={() => setDate(selectedYear, selectedMonth, selectedDay === d ? null : d)}
              >
                <Text
                  style={[
                    styles.monthButtonText,
                    selectedDay === d && styles.monthButtonTextActive,
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Movie List */}
      <FlashList
        data={groupedMovies}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No releases found for the selected filters.</Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearFiltersLink}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.red600} />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isPast = item.movieDate < today;
          const isToday = item.movieDate.toDateString() === today.toDateString();

          return (
            <View style={styles.dateGroup}>
              {/* Date Header */}
              <View style={styles.dateHeader}>
                <View
                  style={[
                    styles.dateBox,
                    isToday && styles.dateBoxToday,
                    !isToday && !isPast && styles.dateBoxUpcoming,
                    isPast && styles.dateBoxPast,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateBoxMonth,
                      isToday && { color: colors.white },
                      isPast && { color: colors.white40 },
                      !isToday && !isPast && { color: '#A78BFA' },
                    ]}
                  >
                    {item.movieDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={[styles.dateBoxDay, isPast && { color: colors.white40 }]}>
                    {item.movieDate.getDate()}
                  </Text>
                </View>
                <View style={styles.dateInfo}>
                  <Text
                    style={[
                      styles.dateWeekday,
                      isToday && { color: colors.red500 },
                      isPast && { color: colors.white40 },
                    ]}
                  >
                    {item.movieDate.toLocaleDateString('en-US', { weekday: 'long' })}
                  </Text>
                  <Text style={[styles.dateFull, isPast && { color: colors.white30 }]}>
                    {item.movieDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  {isToday && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>TODAY</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.releaseCount, isPast && { color: colors.white30 }]}>
                  {item.movies.length} {item.movies.length === 1 ? 'release' : 'releases'}
                </Text>
              </View>

              {/* Movie Cards */}
              {item.movies.map((movie) => (
                <MovieListItem
                  key={movie.id}
                  movie={movie}
                  platforms={platformMap[movie.id]}
                  isPast={isPast}
                />
              ))}
            </View>
          );
        }}
      />
    </View>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
      <TouchableOpacity onPress={onRemove}>
        <Ionicons name="close" size={14} color={colors.red400} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },
  safeAreaCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.black,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.red600,
  },
  filterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.red600_20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    color: colors.red400,
    fontSize: 14,
  },
  clearAll: {
    color: colors.red500,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  filterPanel: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.white5,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: colors.white60,
    marginBottom: 8,
  },
  yearButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  yearButtonActive: {
    backgroundColor: colors.red600,
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white60,
  },
  yearButtonTextActive: {
    color: colors.white,
  },
  yearDropdown: {
    marginTop: 8,
    backgroundColor: '#27272A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.white10,
    maxHeight: 200,
  },
  yearOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.white5,
  },
  yearOptionActive: {
    backgroundColor: colors.red600,
  },
  yearOptionText: {
    color: colors.white60,
    fontSize: 14,
    fontWeight: '500',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayScroll: {
    gap: 8,
  },
  dayButton: {
    width: 44,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.white5,
    alignItems: 'center',
  },
  monthButton: {
    width: '30%',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.white5,
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: colors.red600,
  },
  monthButtonText: {
    color: colors.white60,
    fontSize: 14,
    fontWeight: '500',
  },
  monthButtonTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 120,
  },
  dateGroup: {
    marginBottom: 24,
    gap: 12,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  dateBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dateBoxToday: {
    backgroundColor: colors.red600,
  },
  dateBoxUpcoming: {
    backgroundColor: colors.purple600_20,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  dateBoxPast: {
    backgroundColor: colors.white5,
  },
  dateBoxMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  dateBoxDay: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  dateInfo: {
    flex: 1,
  },
  dateWeekday: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  dateFull: {
    fontSize: 14,
    color: colors.white60,
  },
  todayBadge: {
    marginTop: 4,
    backgroundColor: colors.red600,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  todayBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  releaseCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white50,
    flexShrink: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    color: colors.white60,
    fontSize: 16,
  },
  clearFiltersLink: {
    color: colors.red500,
    marginTop: 16,
    textDecorationLine: 'underline',
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
