import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { deriveMovieStatus } from '@shared/movieStatus';
import { getMovieStatusLabel, getMovieStatusColor } from '@/constants';
import type { Movie } from '@/types';
import type { OTTPlatform } from '@/types/ott';
import type { SemanticTheme } from '@shared/themes';
import { useMovieAction } from '@/hooks/useMovieAction';
import { MovieQuickAction } from '@/components/movie/MovieQuickAction';
import { MovieRating } from '@/components/ui/MovieRating';

export interface SearchResultMovieProps {
  movie: Movie;
  platforms: OTTPlatform[];
  onPress: () => void;
}

export function SearchResultMovie({ movie, platforms, onPress }: SearchResultMovieProps) {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const status = deriveMovieStatus(movie, platforms.length);
  const { actionType, isActive, onPress: handleAction } = useMovieAction(movie, platforms.length);

  return (
    <TouchableOpacity style={s.row} onPress={onPress} accessibilityLabel={movie.title}>
      <View style={s.posterContainer}>
        <Image
          source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? PLACEHOLDER_POSTER }}
          style={s.poster}
          contentFit="cover"
        />
        {platforms.length > 0 && (
          <View style={[s.platformBadge, { backgroundColor: platforms[0].color }]}>
            <Text style={s.platformBadgeText}>{platforms[0].logo}</Text>
          </View>
        )}
        <MovieQuickAction
          actionType={actionType}
          isActive={isActive}
          onPress={handleAction}
          movieTitle={movie.title}
        />
      </View>
      <View style={s.info}>
        <Text style={s.title} numberOfLines={1}>
          {movie.title}
        </Text>
        <View style={s.meta}>
          <View style={[s.badge, { backgroundColor: getMovieStatusColor(status) }]}>
            <Text style={s.badgeText}>{getMovieStatusLabel(status)}</Text>
          </View>
          <MovieRating
            rating={movie.rating}
            size={12}
            containerStyle={s.rating}
            textStyle={s.ratingText}
          />
        </View>
        {movie.director && <Text style={s.director}>{movie.director}</Text>}
        {movie.genres.length > 0 && (
          <Text style={s.genres} numberOfLines={1}>
            {movie.genres.join(' • ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    posterContainer: { position: 'relative' as const },
    poster: { width: 64, height: 96, borderRadius: 8 },
    info: { flex: 1, justifyContent: 'center', gap: 4 },
    title: { fontSize: 16, fontWeight: '600', color: t.textPrimary },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.white,
      textTransform: 'uppercase',
    },
    rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { color: t.textPrimary, fontSize: 13, fontWeight: '600' },
    director: { fontSize: 13, color: t.textSecondary },
    genres: { fontSize: 12, color: t.textSecondary },
    platformBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
    },
    platformBadgeText: { fontSize: 10, fontWeight: '700', color: t.textPrimary },
  });
