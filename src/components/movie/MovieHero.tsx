import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { getBackdropUrl, getPosterUrl } from '@/features/movies/api/tmdb';

interface MovieHeroProps {
  backdropPath: string | null;
  posterPath: string | null;
}

export default function MovieHero({ backdropPath, posterPath }: MovieHeroProps) {
  const backdropUrl = getBackdropUrl(backdropPath, 'large');
  const posterUrl = getPosterUrl(posterPath, 'medium');

  return (
    <View testID="movie-hero" style={styles.container}>
      {backdropUrl ? (
        <Image
          testID="hero-backdrop"
          source={{ uri: backdropUrl }}
          style={styles.backdrop}
          contentFit="cover"
        />
      ) : (
        <View testID="hero-backdrop-placeholder" style={[styles.backdrop, styles.placeholder]} />
      )}
      <View style={styles.gradientOverlay} />
      {posterUrl && (
        <Image
          testID="hero-poster"
          source={{ uri: posterUrl }}
          style={styles.poster}
          contentFit="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: 220,
  },
  placeholder: {
    backgroundColor: '#333333',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  poster: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    width: 100,
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
