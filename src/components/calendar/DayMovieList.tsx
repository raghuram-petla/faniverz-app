import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import MovieListItem from '../movie/MovieListItem';
import type { CalendarEntry } from '@/types/movie';

interface DayMovieListProps {
  date: Date | null;
  entries: CalendarEntry[];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function DayMovieList({ date, entries }: DayMovieListProps) {
  const { colors } = useTheme();
  const router = useRouter();

  if (!date) return null;

  return (
    <View testID="day-movie-list" style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text testID="day-title" style={[styles.dateTitle, { color: colors.text }]}>
        {formatDisplayDate(date)}
      </Text>
      {entries.length === 0 ? (
        <Text testID="no-movies" style={[styles.empty, { color: colors.textTertiary }]}>
          No releases on this day
        </Text>
      ) : (
        <FlatList
          testID="day-movie-flatlist"
          data={entries}
          keyExtractor={(item, index) => `${item.movie.id}-${item.dotType}-${index}`}
          renderItem={({ item }) => (
            <MovieListItem
              entry={item}
              onPress={() => router.push(`/movie/${item.movie.id}` as never)}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.divider }]} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    flex: 1,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  },
  separator: {
    height: 1,
    marginHorizontal: 12,
  },
});
