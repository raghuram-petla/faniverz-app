import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { getMovieStatusLabel } from '@/constants';
import type { MovieStatus } from '@/types';
import type { MovieWithDetails } from '@/types/movie';
import { createStyles } from '@/styles/movieDetail.styles';
import { getImageUrl } from '@shared/imageUrl';

interface MovieHeroSectionProps {
  movie: MovieWithDetails;
  movieStatus: MovieStatus;
  releaseYear: number | null;
}

export function MovieHeroSection({ movie, movieStatus, releaseYear }: MovieHeroSectionProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.hero}>
      <Image
        source={{
          uri:
            getImageUrl(movie.backdrop_url, 'md') ??
            getImageUrl(movie.poster_url, 'md') ??
            undefined,
        }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={
          (movie.detail_focus_x ?? movie.backdrop_focus_x) != null &&
          (movie.detail_focus_y ?? movie.backdrop_focus_y) != null
            ? {
                left: `${Math.round(((movie.detail_focus_x ?? movie.backdrop_focus_x) as number) * 100)}%`,
                top: `${Math.round(((movie.detail_focus_y ?? movie.backdrop_focus_y) as number) * 100)}%`,
              }
            : undefined
        }
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
        locations={[0, 0.2, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.heroInfo}>
        <View style={styles.heroInfoRow}>
          <Image
            source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? undefined }}
            style={styles.heroPoster}
            contentFit="cover"
          />
          <View style={styles.heroInfoText}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{getMovieStatusLabel(movieStatus)}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {movie.title}
            </Text>
            {movie.rating > 0 && (
              <View style={styles.heroRatingRow}>
                <Ionicons name="star" size={20} color={colors.yellow400} />
                <Text style={styles.heroRatingValue}>{movie.rating}</Text>
                <Text style={styles.heroReviewCount}>({movie.review_count} reviews)</Text>
              </View>
            )}
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMeta}>{releaseYear}</Text>
              {movie.runtime ? (
                <>
                  <Text style={styles.heroMetaDot}>|</Text>
                  <Text style={styles.heroMeta}>{movie.runtime}m</Text>
                </>
              ) : null}
              {movie.certification && (
                <>
                  <Text style={styles.heroMetaDot}>|</Text>
                  <Text style={styles.heroMeta}>{movie.certification}</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
