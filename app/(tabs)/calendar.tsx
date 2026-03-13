import { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useUpcomingMovies } from '@/features/movies/hooks/useUpcomingMovies';
import { useMoviePlatformMap } from '@/features/ott/hooks';
import { MovieListItem } from '@/components/movie/MovieListItem';
import { Movie } from '@/types';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { CalendarFilterPanel } from '@/components/calendar/CalendarFilterPanel';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollToTop } from '@react-navigation/native';
import { CalendarSkeleton } from '@/components/calendar/CalendarSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterPill } from '@/components/calendar/FilterPill';
import { createStyles } from '@/styles/tabs/calendar.styles';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// @boundary Calendar tab — upcoming release dates grouped by day, filterable by year/month/day
// @coupling useCalendarStore (Zustand), useUpcomingMovies (infinite query), useMoviePlatformMap
export default function CalendarScreen() {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading, refetch } =
    useUpcomingMovies();

  const allMovies = useMemo(() => data?.pages.flat() ?? [], [data]);
  const movieIds = useMemo(() => allMovies.map((m) => m.id), [allMovies]);
  const { data: platformMap = {}, refetch: refetchPlatforms } = useMoviePlatformMap(movieIds);
  const { refreshing, onRefresh } = useRefresh(refetch, refetchPlatforms);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);
  const listRef = useRef(null);
  useScrollToTop(listRef);

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

  // @invariant today is midnight-normalized and memoized once per mount (no dependency array items)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // @contract Returns all movies when no filters active; filters are AND-combined (year AND month AND day)
  // @edge Movies without release_date are excluded when any filter is active
  const filteredMovies = useMemo(() => {
    if (!hasUserFiltered) return allMovies;
    return allMovies.filter((movie) => {
      if (!movie.release_date) return false;
      const d = new Date(movie.release_date);
      if (selectedYear !== null && d.getFullYear() !== selectedYear) return false;
      if (selectedMonth !== null && d.getMonth() !== selectedMonth) return false;
      if (selectedDay !== null && d.getDate() !== selectedDay) return false;
      return true;
    });
  }, [allMovies, hasUserFiltered, selectedYear, selectedMonth, selectedDay]);

  // @contract Groups movies by release_date string — each group becomes a date header + card list
  // @nullable movie.release_date can be null; those get grouped under empty string key
  const groupedMovies = useMemo(() => {
    const groups: { date: string; movies: Movie[]; movieDate: Date }[] = [];
    const map = new Map<string, Movie[]>();

    for (const movie of filteredMovies) {
      const key = movie.release_date ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(movie);
    }

    for (const [dateStr, movies] of map) {
      groups.push({ date: dateStr, movies, movieDate: new Date(dateStr) });
    }

    return groups;
  }, [filteredMovies]);

  // @contract Extracts unique years from all movies (not filtered), sorted descending for year picker
  const years = useMemo(
    () =>
      Array.from(
        new Set(
          allMovies
            .filter((m) => m.release_date)
            .map((m) => new Date(m.release_date ?? '').getFullYear()),
        ),
      ).sort((a, b) => b - a),
    [allMovies],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={toggleFilters}
          accessibilityRole="button"
          accessibilityLabel="Toggle filters"
        >
          <Ionicons name="options-outline" size={20} color={theme.textPrimary} />
          {hasUserFiltered && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Active Filter Pills */}
      {hasUserFiltered && (
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
            <Text style={styles.clearAll}>{t('common.clearAll')}</Text>
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
        ref={listRef}
        data={groupedMovies}
        keyExtractor={(item) => item.date}
        drawDistance={500}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={t('calendar.noReleasesFound')}
            subtitle={t('calendar.noReleasesSubtitle')}
            actionLabel={hasUserFiltered ? t('calendar.clearFilters') : undefined}
            onAction={hasUserFiltered ? clearFilters : undefined}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.red600} />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          // @contract Three visual states: past (dimmed), today (red highlight), upcoming (violet)
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
                      !isToday && !isPast && { color: colors.violet400 },
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
                      <Text style={styles.todayBadgeText}>{t('calendar.today')}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.releaseCount, isPast && { color: theme.textDisabled }]}>
                  {item.movies.length === 1
                    ? t('calendar.release', { count: 1 })
                    : t('calendar.releases', { count: item.movies.length })}
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
