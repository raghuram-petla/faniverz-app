import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';
import { getPosterUrl } from '@/features/movies/api/tmdb';
import ReleaseTypeBadge from './ReleaseTypeBadge';
import type { CalendarEntry } from '@/types/movie';

interface MovieListItemProps {
  entry: CalendarEntry;
  onPress?: () => void;
}

export default function MovieListItem({ entry, onPress }: MovieListItemProps) {
  const { colors } = useTheme();
  const posterUrl = getPosterUrl(entry.movie.poster_path, 'small');

  return (
    <TouchableOpacity testID="movie-list-item" style={styles.container} onPress={onPress}>
      {posterUrl ? (
        <Image
          testID="movie-poster"
          source={{ uri: posterUrl }}
          style={styles.poster}
          contentFit="cover"
        />
      ) : (
        <View testID="poster-placeholder" style={[styles.poster, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text testID="movie-title" style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {entry.movie.title}
        </Text>
        {entry.movie.title_te && (
          <Text style={[styles.titleTe, { color: colors.textSecondary }]} numberOfLines={1}>
            {entry.movie.title_te}
          </Text>
        )}
        <Text style={[styles.meta, { color: colors.textTertiary }]}>
          {entry.movie.genres.slice(0, 3).join(' · ')}
        </Text>
        <ReleaseTypeBadge dotType={entry.dotType} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 6,
  },
  placeholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#999999',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  titleTe: {
    fontSize: 14,
  },
  meta: {
    fontSize: 12,
  },
});
