import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import { Movie, OTTPlatform } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PlatformBadge } from '@/components/ui/PlatformBadge';
import { deriveMovieStatus } from '@shared/movieStatus';
import { getImageUrl, posterBucket } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { useMovieAction } from '@/hooks/useMovieAction';
import { MovieQuickAction } from './MovieQuickAction';
import { useTranslation } from 'react-i18next';

/** @contract Compact poster card used in horizontal scroll lists (128px wide, 2:3 aspect) */
interface MovieCardProps {
  movie: Movie;
  /** @nullable When undefined, platform badges and streaming status badge are hidden */
  platforms?: OTTPlatform[];
  /** @coupling Set true in calendar/upcoming sections to show date badge instead of rating */
  showReleaseDate?: boolean;
  showTypeBadge?: boolean;
  testID?: string;
}

export function MovieCard({
  movie,
  platforms,
  showReleaseDate,
  showTypeBadge = true,
  testID,
}: MovieCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  /** @boundary status drives badge visibility, action type, and release date formatting */
  const status = deriveMovieStatus(movie, platforms?.length ?? 0);
  /** @sideeffect useMovieAction internally auth-gates and fires follow/watchlist mutations */
  const {
    actionType,
    isActive,
    onPress: handleAction,
  } = useMovieAction(movie, platforms?.length ?? 0);

  const handlePress = () => {
    router.push(`/movie/${movie.id}`);
  };

  /** @nullable release_date may be null for TBA movies — monthAbbr falls back to "TBA" */
  // @edge: append T00:00:00 to parse as local time — avoids off-by-one day/month for UTC-N users
  const releaseDate = movie.release_date ? new Date(`${movie.release_date}T00:00:00`) : null;
  const monthAbbr =
    releaseDate?.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() ?? t('movie.tba');
  const day = releaseDate?.getDate() ?? '';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={movie.title}
      testID={testID}
    >
      <View style={styles.posterContainer}>
        <Image
          source={{
            uri:
              getImageUrl(movie.poster_url, 'sm', posterBucket(movie.poster_image_type)) ??
              PLACEHOLDER_POSTER,
          }}
          style={styles.poster}
          contentFit="cover"
          transition={200}
        />

        {/* Status badge — top-left (hidden when section header already conveys the type) */}
        {showTypeBadge && status === 'in_theaters' && (
          <View style={styles.badgeTopLeft}>
            <StatusBadge type="in_theaters" />
          </View>
        )}

        {/* Release date badge — top-left for upcoming */}
        {showReleaseDate && status === 'upcoming' && (
          <View style={styles.badgeTopLeft}>
            <View style={[styles.dateBadge, { backgroundColor: palette.red600 }]}>
              <Text style={styles.dateBadgeMonth}>{monthAbbr}</Text>
              <Text style={styles.dateBadgeDay}>{day}</Text>
            </View>
          </View>
        )}

        {/* Status badge — purple for streaming */}
        {showReleaseDate && status !== 'upcoming' && status === 'streaming' && (
          <View style={styles.badgeTopLeft}>
            <StatusBadge type="streaming" />
          </View>
        )}

        {/* OTT platform icons — top-right */}
        {/** @edge Caps at 2 platform badges to avoid overflowing the poster corner */}
        {platforms && platforms.length > 0 && (
          <View style={styles.badgeTopRight}>
            {platforms.slice(0, 2).map((platform) => (
              <PlatformBadge key={platform.id} platform={platform} size={24} />
            ))}
          </View>
        )}

        <MovieQuickAction
          actionType={actionType}
          isActive={isActive}
          onPress={handleAction}
          movieTitle={movie.title}
        />
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {movie.title}
      </Text>

      {/** @invariant Rating and release date are mutually exclusive — showReleaseDate takes precedence */}
      {movie.rating > 0 && !showReleaseDate && (
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={palette.yellow400} />
          <Text style={styles.ratingText}>{movie.rating}</Text>
        </View>
      )}

      {showReleaseDate && releaseDate && (
        <Text style={styles.releaseDateText}>
          {releaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      width: 128,
      flexShrink: 0,
    },
    posterContainer: {
      width: 128,
      aspectRatio: 2 / 3,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 8,
    },
    poster: {
      width: '100%',
      height: '100%',
    },
    badgeTopLeft: {
      position: 'absolute',
      top: 8,
      left: 8,
    },
    badgeTopRight: {
      position: 'absolute',
      top: 8,
      right: 8,
      flexDirection: 'row',
      gap: 4,
    },
    dateBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignItems: 'center',
    },
    dateBadgeMonth: {
      fontSize: 10,
      fontWeight: '700',
      color: palette.white,
      lineHeight: 12,
    },
    dateBadgeDay: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.white,
      lineHeight: 16,
      marginTop: 2,
    },
    title: {
      fontSize: 13,
      fontWeight: '500',
      color: t.textPrimary,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    ratingText: {
      fontSize: 12,
      color: t.textSecondary,
    },
    releaseDateText: {
      fontSize: 12,
      color: t.textTertiary,
      marginTop: 4,
    },
  });
