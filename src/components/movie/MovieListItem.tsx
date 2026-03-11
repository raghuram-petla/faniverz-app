import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import { PlatformBadge } from '@/components/ui/PlatformBadge';
import { Movie, OTTPlatform } from '@/types';
import { deriveMovieStatus } from '@shared/movieStatus';
import { getImageUrl } from '@shared/imageUrl';
import { useMovieAction } from '@/hooks/useMovieAction';
import { MovieQuickAction } from './MovieQuickAction';

interface MovieListItemProps {
  movie: Movie;
  platforms?: OTTPlatform[];
  isPast?: boolean;
  testID?: string;
}

export function MovieListItem({ movie, platforms, isPast, testID }: MovieListItemProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const status = deriveMovieStatus(movie, platforms?.length ?? 0);
  const {
    actionType,
    isActive,
    onPress: handleAction,
  } = useMovieAction(movie, platforms?.length ?? 0);

  const handlePress = () => {
    router.push(`/movie/${movie.id}`);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isPast && styles.containerPast]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={movie.title}
      testID={testID}
    >
      {/* Poster */}
      <View style={styles.posterContainer}>
        <Image
          source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? undefined }}
          style={[styles.poster, isPast && styles.posterPast]}
          contentFit="cover"
          transition={200}
        />
        {status === 'in_theaters' && (
          <View style={styles.posterBadgeLeft}>
            <View style={styles.theaterBadge}>
              <Text style={styles.theaterBadgeText}>Theater</Text>
            </View>
          </View>
        )}
        {status === 'streaming' && platforms && platforms.length > 0 && (
          <View style={styles.posterBadgeRight}>
            <PlatformBadge platform={platforms[0]} size={24} />
          </View>
        )}
        <MovieQuickAction
          actionType={actionType}
          isActive={isActive}
          onPress={handleAction}
          movieTitle={movie.title}
        />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.title, isPast && styles.titlePast]} numberOfLines={2}>
          {movie.title}
        </Text>

        {/* Genres */}
        {movie.genres.length > 0 && (
          <View style={styles.genreRow}>
            {movie.genres.slice(0, 2).map((genre) => (
              <View key={genre} style={[styles.genrePill, isPast && styles.genrePillPast]}>
                <Text style={[styles.genreText, isPast && styles.genreTextPast]}>{genre}</Text>
              </View>
            ))}
          </View>
        )}

        {/* OTT Platforms */}
        {platforms && platforms.length > 0 && (
          <View style={styles.platformRow}>
            {platforms.map((platform) => (
              <View
                key={platform.id}
                style={[
                  styles.platformPill,
                  { backgroundColor: platform.color },
                  isPast && styles.platformPillPast,
                ]}
              >
                <Text style={styles.platformName}>{platform.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Rating */}
        {(status === 'in_theaters' || status === 'streaming') && movie.rating > 0 && (
          <View style={[styles.ratingRow, isPast && styles.ratingRowPast]}>
            <Ionicons name="star" size={14} color={palette.yellow400} />
            <Text style={styles.ratingValue}>{movie.rating}</Text>
            <Text style={styles.ratingMax}>/ 5</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: t.surface,
      borderColor: t.border,
    },
    containerPast: {
      backgroundColor: t.surfaceMuted,
      borderColor: t.borderSubtle,
    },
    posterContainer: {
      width: 96,
      aspectRatio: 2 / 3,
      borderRadius: 8,
      overflow: 'hidden',
      flexShrink: 0,
    },
    poster: {
      width: '100%',
      height: '100%',
    },
    posterPast: {
      opacity: 0.7,
    },
    posterBadgeLeft: {
      position: 'absolute',
      top: 6,
      left: 6,
    },
    posterBadgeRight: {
      position: 'absolute',
      top: 6,
      right: 6,
    },
    theaterBadge: {
      backgroundColor: palette.red600,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    theaterBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: t.textPrimary,
      marginBottom: 8,
    },
    titlePast: {
      color: t.textSecondary,
    },
    genreRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    genrePill: {
      backgroundColor: t.inputHover,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    genrePillPast: {
      backgroundColor: t.input,
    },
    genreText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.textSecondary,
    },
    genreTextPast: {
      color: t.textTertiary,
    },
    platformRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    platformPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    platformPillPast: {
      opacity: 0.6,
    },
    platformName: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    ratingRowPast: {
      opacity: 0.6,
    },
    ratingValue: {
      fontSize: 14,
      fontWeight: '600',
      color: t.textSecondary,
    },
    ratingMax: {
      fontSize: 12,
      color: t.textTertiary,
    },
  });
