import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { createStyles } from '@/styles/search.styles';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { MovieRating } from '@/components/ui/MovieRating';
import type { Movie } from '@/types';

export interface TrendingMoviesProps {
  movies: Movie[];
  onMoviePress: (movie: Movie) => void;
}

export function TrendingMovies({ movies, onMoviePress }: TrendingMoviesProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  /** @edge returns null when no trending movies — parent handles the empty search state */
  if (movies.length === 0) return null;

  return (
    <View style={styles.trendingSection}>
      <View style={styles.trendingHeader}>
        <Ionicons name="trending-up" size={20} color={colors.red500} />
        <Text style={styles.trendingTitle}>{t('search.trendingNow')}</Text>
      </View>
      {movies.map((movie, index) => (
        <TouchableOpacity
          key={movie.id}
          style={styles.trendingItem}
          onPress={() => onMoviePress(movie)}
        >
          <View style={styles.trendingRank}>
            <Text style={styles.trendingRankText}>{index + 1}</Text>
          </View>
          <Image
            source={{ uri: getImageUrl(movie.poster_url, 'sm', 'POSTERS') ?? PLACEHOLDER_POSTER }}
            style={styles.trendingPoster}
            contentFit="cover"
          />
          <View style={styles.trendingInfo}>
            <Text style={styles.trendingMovieTitle} numberOfLines={1}>
              {movie.title}
            </Text>
            <View style={styles.trendingMeta}>
              <MovieRating rating={movie.rating} size={12} textStyle={styles.trendingRating} />
              <Text style={styles.trendingDot}>•</Text>
              <Text style={styles.trendingReviews}>
                {movie.review_count} {t('search.reviews')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
