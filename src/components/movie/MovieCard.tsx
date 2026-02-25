import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Movie, OTTPlatform } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PlatformBadge } from '@/components/ui/PlatformBadge';

interface MovieCardProps {
  movie: Movie;
  platforms?: OTTPlatform[];
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
  const router = useRouter();

  const handlePress = () => {
    router.push(`/movie/${movie.id}`);
  };

  const releaseDate = new Date(movie.release_date);
  const monthAbbr = releaseDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = releaseDate.getDate();

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
          source={{ uri: movie.poster_url ?? undefined }}
          style={styles.poster}
          contentFit="cover"
          transition={200}
        />

        {/* Status badge — top-left (hidden when section header already conveys the type) */}
        {showTypeBadge && movie.release_type === 'theatrical' && (
          <View style={styles.badgeTopLeft}>
            <StatusBadge type="theatrical" />
          </View>
        )}

        {/* Release date badge — top-left for upcoming */}
        {showReleaseDate && movie.release_type === 'upcoming' && (
          <View style={styles.badgeTopLeft}>
            <View style={[styles.dateBadge, { backgroundColor: colors.red600 }]}>
              <Text style={styles.dateBadgeMonth}>{monthAbbr}</Text>
              <Text style={styles.dateBadgeDay}>{day}</Text>
            </View>
          </View>
        )}

        {/* Release date badge — purple for upcoming OTT */}
        {showReleaseDate && movie.release_type !== 'upcoming' && movie.release_type === 'ott' && (
          <View style={styles.badgeTopLeft}>
            <StatusBadge type="ott" />
          </View>
        )}

        {/* OTT platform icons — top-right */}
        {platforms && platforms.length > 0 && (
          <View style={styles.badgeTopRight}>
            {platforms.slice(0, 2).map((platform) => (
              <PlatformBadge key={platform.id} platform={platform} size={24} />
            ))}
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {movie.title}
      </Text>

      {/* Rating or release date below title */}
      {movie.rating > 0 && !showReleaseDate && (
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={colors.yellow400} />
          <Text style={styles.ratingText}>{movie.rating}</Text>
        </View>
      )}

      {showReleaseDate && (
        <Text style={styles.releaseDateText}>
          {releaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    color: colors.white,
    lineHeight: 12,
  },
  dateBadgeDay: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 16,
    marginTop: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.white,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.white60,
  },
  releaseDateText: {
    fontSize: 12,
    color: colors.white50,
    marginTop: 4,
  },
});
