import React, { useMemo } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { useFilterStore } from '@/stores/useFilterStore';
import { useMoviesByMonth } from '@/features/movies/hooks/useMoviesByMonth';
import {
  groupEntriesByDate,
  filterEntriesByReleaseType,
} from '@/features/movies/utils/transformers';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarFilter from '@/components/calendar/CalendarFilter';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import DayMovieList from '@/components/calendar/DayMovieList';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { selectedDate, currentMonth, currentYear, setSelectedDate, navigateMonth } =
    useCalendarStore();
  const { releaseType, setReleaseType } = useFilterStore();
  const { data: entries = [] } = useMoviesByMonth(currentYear, currentMonth);

  const filteredEntries = useMemo(
    () => filterEntriesByReleaseType(entries, releaseType),
    [entries, releaseType]
  );

  const entriesByDate = useMemo(() => groupEntriesByDate(filteredEntries), [filteredEntries]);

  const selectedDateKey = useMemo(() => {
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${selectedDate.getFullYear()}-${m}-${d}`;
  }, [selectedDate]);

  const selectedDayEntries = entriesByDate[selectedDateKey] ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View testID="calendar-screen" style={styles.container}>
        <CalendarHeader
          month={currentMonth}
          year={currentYear}
          onPrev={() => navigateMonth('prev')}
          onNext={() => navigateMonth('next')}
        />
        <CalendarFilter selected={releaseType} onChange={setReleaseType} />
        <CalendarGrid
          month={currentMonth}
          year={currentYear}
          selectedDate={selectedDate}
          entriesByDate={entriesByDate}
          onDayPress={setSelectedDate}
        />
        <DayMovieList date={selectedDate} entries={selectedDayEntries} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
