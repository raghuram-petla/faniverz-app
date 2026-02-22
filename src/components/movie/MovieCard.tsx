import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { getPosterUrl } from '@/features/movies/api/tmdb';
import type { Movie } from '@/types/movie';

interface MovieCardProps {
  movie: Movie;
  onPress?: () => void;
}

export default function MovieCard({ movie, onPress }: MovieCardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const posterUrl = getPosterUrl(movie.poster_path, 'medium');

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/movie/${movie.id}` as never);
    }
  };

  return (
    <TouchableOpacity testID="movie-card" style={styles.container} onPress={handlePress}>
      {posterUrl ? (
        <Image
          testID="movie-card-poster"
          source={{ uri: posterUrl }}
          style={styles.poster}
          contentFit="cover"
        />
      ) : (
        <View testID="movie-card-placeholder" style={[styles.poster, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <Text
        testID="movie-card-title"
        style={[styles.title, { color: colors.text }]}
        numberOfLines={2}
      >
        {movie.title}
      </Text>
      {movie.release_date && (
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {new Date(movie.release_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      )}
      {movie.genres.length > 0 && (
        <Text style={[styles.genres, { color: colors.textTertiary }]} numberOfLines={1}>
          {movie.genres.slice(0, 2).join(' · ')}
        </Text>
      )}
      {movie.vote_average > 0 && (
        <View testID="movie-card-rating" style={styles.ratingContainer}>
          <Text style={styles.ratingText}>★ {movie.vote_average.toFixed(1)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    marginRight: 12,
  },
  poster: {
    width: 140,
    height: 210,
    borderRadius: 8,
  },
  placeholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#999999',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  genres: {
    fontSize: 11,
    marginTop: 2,
  },
  ratingContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
  },
});
