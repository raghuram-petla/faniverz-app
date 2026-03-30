import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { createStyles } from '@/styles/actorDetail.styles';
import { getImageUrl, posterBucket } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { extractReleaseYear } from '@/utils/formatDate';

export interface FilmCredit {
  id: string;
  credit_type: string;
  role_name: string | null;
  movie?: {
    id: string;
    title: string;
    poster_url: string | null;
    poster_image_type?: 'poster' | 'backdrop' | null;
    release_date: string | null;
    rating: number;
  } | null;
}

/** @contract Renders filmography list with poster, title, year, role, and rating for each movie */
export interface ActorFilmographyProps {
  /** @boundary Credits with null movie are silently skipped (deleted movie records) */
  credits: FilmCredit[];
  onMoviePress: (movieId: string) => void;
}

export function ActorFilmography({ credits, onMoviePress }: ActorFilmographyProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <>
      <View style={styles.filmographyHeader}>
        <Text style={styles.filmographyTitle}>{t('actorDetail.filmography')}</Text>
        {credits.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{credits.length}</Text>
          </View>
        )}
      </View>

      {credits.length === 0 ? (
        <EmptyState
          icon="film-outline"
          title={t('actorDetail.noMovies')}
          subtitle={t('actorDetail.noMoviesSubtitle')}
        />
      ) : (
        <View style={styles.filmographyList}>
          {credits.map((credit) => {
            /** @nullable movie may be null if the referenced movie was deleted */
            const movie = credit.movie;
            if (!movie) return null;
            const year = extractReleaseYear(movie.release_date);
            /** @contract cast credits prefix role_name with "as"; crew credits show role_name directly */
            const roleText =
              credit.credit_type === 'cast' && credit.role_name
                ? t('movie.asRole', { role: credit.role_name })
                : credit.role_name;
            return (
              <TouchableOpacity
                key={credit.id}
                style={styles.filmCard}
                onPress={() => onMoviePress(movie.id)}
                activeOpacity={0.7}
                testID={`film-card-${movie.id}`}
              >
                <Image
                  source={{
                    uri:
                      getImageUrl(movie.poster_url, 'sm', posterBucket(movie.poster_image_type)) ??
                      PLACEHOLDER_POSTER,
                  }}
                  style={styles.filmPoster}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.filmInfo}>
                  <Text style={styles.filmTitle} numberOfLines={2}>
                    {movie.title}
                  </Text>
                  {year && <Text style={styles.filmYear}>{year}</Text>}
                  {roleText && (
                    <Text style={styles.filmRole} numberOfLines={1}>
                      {roleText}
                    </Text>
                  )}
                  {movie.rating > 0 && (
                    <View style={styles.filmRatingRow}>
                      <Ionicons name="star" size={12} color={colors.yellow400} />
                      <Text style={styles.filmRatingValue}>{movie.rating}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );
}
