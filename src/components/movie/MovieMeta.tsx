import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import ReleaseTypeBadge from './ReleaseTypeBadge';
import type { Movie, DotType } from '@/types/movie';

interface MovieMetaProps {
  movie: Movie;
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MovieMeta({ movie }: MovieMetaProps) {
  const { colors } = useTheme();

  const dotType: DotType = movie.release_type === 'ott_original' ? 'ott_original' : 'theatrical';

  return (
    <View testID="movie-meta" style={styles.container}>
      <Text testID="movie-detail-title" style={[styles.title, { color: colors.text }]}>
        {movie.title}
      </Text>
      {movie.title_te && (
        <Text testID="movie-title-te" style={[styles.titleTe, { color: colors.textSecondary }]}>
          {movie.title_te}
        </Text>
      )}
      <View style={styles.infoRow}>
        {movie.release_date && (
          <Text style={[styles.info, { color: colors.textSecondary }]}>
            {new Date(movie.release_date + 'T00:00:00').toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        )}
        {movie.runtime && (
          <Text style={[styles.info, { color: colors.textSecondary }]}>
            {formatRuntime(movie.runtime)}
          </Text>
        )}
        {movie.certification && (
          <View style={[styles.certBadge, { borderColor: colors.textTertiary }]}>
            <Text style={[styles.certText, { color: colors.textTertiary }]}>
              {movie.certification}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.genresRow}>
        {movie.genres.map((genre) => (
          <View key={genre} style={[styles.genreChip, { backgroundColor: colors.surface }]}>
            <Text style={[styles.genreText, { color: colors.textSecondary }]}>{genre}</Text>
          </View>
        ))}
      </View>
      <ReleaseTypeBadge dotType={dotType} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  titleTe: {
    fontSize: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    fontSize: 14,
  },
  certBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  certText: {
    fontSize: 12,
    fontWeight: '600',
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genreText: {
    fontSize: 12,
  },
});
