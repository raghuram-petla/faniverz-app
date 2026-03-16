import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { createStyles } from '@/styles/actorDetail.styles';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import type { FilmCredit } from './ActorFilmography';

export interface ActorKnownForProps {
  credits: FilmCredit[];
  onMoviePress: (movieId: string) => void;
}

export function ActorKnownFor({ credits, onMoviePress }: ActorKnownForProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  /** @contract shows top 5 credits by rating; excludes credits without a movie or with 0 rating */
  const topCredits = credits
    .filter((c) => c.movie && c.movie.rating > 0)
    .sort((a, b) => (b.movie?.rating ?? 0) - (a.movie?.rating ?? 0))
    .slice(0, 5);

  /** @edge returns null when no rated credits exist — parent must handle missing section */
  if (topCredits.length === 0) return null;

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={[styles.filmographyTitle, { marginBottom: 12 }]}>
        {t('actorDetail.knownFor')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {topCredits.map((credit) => {
          const movie = credit.movie;
          if (!movie) return null;
          return (
            <TouchableOpacity
              key={credit.id}
              onPress={() => onMoviePress(movie.id)}
              activeOpacity={0.7}
              testID={`known-for-${movie.id}`}
              style={{ width: 110 }}
            >
              <Image
                source={{
                  uri: getImageUrl(movie.poster_url, 'sm', 'POSTERS') ?? PLACEHOLDER_POSTER,
                }}
                style={{ width: 110, height: 165, borderRadius: 10 }}
                contentFit="cover"
                transition={200}
              />
              <Text
                style={{ fontSize: 12, fontWeight: '600', color: theme.textPrimary, marginTop: 6 }}
                numberOfLines={2}
              >
                {movie.title}
              </Text>
              {movie.rating > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                  <Ionicons name="star" size={10} color={colors.yellow400} />
                  <Text style={{ fontSize: 11, color: colors.yellow400, fontWeight: '600' }}>
                    {movie.rating}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
