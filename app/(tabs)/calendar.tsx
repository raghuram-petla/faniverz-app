import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useUpcomingMovies } from '@/features/movies/hooks/useUpcomingMovies';
import { useMoviePlatformMap } from '@/features/ott/hooks';
import { MovieListItem } from '@/components/movie/MovieListItem';
import { Movie } from '@/types';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { CalendarFilterPanel } from '@/components/calendar/CalendarFilterPanel';
import { createStyles } from '@/styles/tabs/calendar.styles';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CalendarScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
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
          <Ionicons name="options-outline" size={20} color={theme.textPrimary} />
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
        <CalendarFilterPanel
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedDay={selectedDay}
          years={years}
          showYearPicker={showYearPicker}
          onToggleYearPicker={() => setShowYearPicker(!showYearPicker)}
          onSetDate={setDate}
          styles={styles}
        />
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
                      isPast && { color: theme.textTertiary },
                      !isToday && !isPast && { color: '#A78BFA' },
                    ]}
                  >
                    {item.movieDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.dateBoxDay,
                      isToday && { color: colors.white },
                      isPast && { color: theme.textTertiary },
                    ]}
                  >
                    {item.movieDate.getDate()}
                  </Text>
                </View>
                <View style={styles.dateInfo}>
                  <Text
                    style={[
                      styles.dateWeekday,
                      isToday && { color: colors.red500 },
                      isPast && { color: theme.textTertiary },
                    ]}
                  >
                    {item.movieDate.toLocaleDateString('en-US', { weekday: 'long' })}
                  </Text>
                  <Text style={[styles.dateFull, isPast && { color: theme.textDisabled }]}>
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
                <Text style={[styles.releaseCount, isPast && { color: theme.textDisabled }]}>
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
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
      <TouchableOpacity onPress={onRemove}>
        <Ionicons name="close" size={14} color={colors.red400} />
      </TouchableOpacity>
    </View>
  );
}
