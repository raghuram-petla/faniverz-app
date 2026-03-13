import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { getMovieStatusLabel } from '@/constants';
import type { MovieStatus } from '@/types';
import type { MovieWithDetails } from '@/types/movie';
import { createStyles } from '@/styles/movieDetail.styles';
import { useTranslation } from 'react-i18next';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';

/** @contract Full-width hero with backdrop, gradient overlay, poster thumbnail, and meta info */
interface MovieHeroSectionProps {
  movie: MovieWithDetails;
  movieStatus: MovieStatus;
  /** @nullable null when release_date is not set (TBA movies) */
  releaseYear: number | null;
}

export function MovieHeroSection({ movie, movieStatus, releaseYear }: MovieHeroSectionProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.hero}>
      {/** @nullable backdrop_url/poster_url may be null; cascading fallback to PLACEHOLDER_POSTER */}
      <Image
        source={{
          uri:
            getImageUrl(movie.backdrop_url, 'md') ??
            getImageUrl(movie.poster_url, 'md') ??
            PLACEHOLDER_POSTER,
        }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        recyclingKey={`hero-${movie.id}`}
        cachePolicy="memory-disk"
        /** @nullable detail_focus_x/y overrides backdrop_focus_x/y; both may be null */
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
            source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? PLACEHOLDER_POSTER }}
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
            {/** @edge rating of 0 means no reviews — entire rating row hidden */}
            {movie.rating > 0 && (
              <View style={styles.heroRatingRow}>
                <Ionicons name="star" size={20} color={colors.yellow400} />
                <Text style={styles.heroRatingValue}>{movie.rating}</Text>
                <Text style={styles.heroReviewCount}>
                  {t('movie.reviewCountLabel', { count: movie.review_count })}
                </Text>
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
