import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Movie, OTTPlatform } from '@/types';

interface MovieListItemProps {
  movie: Movie;
  platforms?: OTTPlatform[];
  isPast?: boolean;
  testID?: string;
}

export function MovieListItem({ movie, platforms, isPast, testID }: MovieListItemProps) {
  const router = useRouter();

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
          source={{ uri: movie.poster_url ?? undefined }}
          style={[styles.poster, isPast && styles.posterPast]}
          contentFit="cover"
          transition={200}
        />
        {movie.release_type === 'theatrical' && (
          <View style={styles.posterBadgeLeft}>
            <View style={styles.theaterBadge}>
              <Text style={styles.theaterBadgeText}>Theater</Text>
            </View>
          </View>
        )}
        {movie.release_type === 'ott' && platforms && platforms.length > 0 && (
          <View style={styles.posterBadgeRight}>
            <View style={[styles.platformIcon, { backgroundColor: platforms[0].color }]}>
              <Text style={styles.platformIconText}>{platforms[0].logo}</Text>
            </View>
          </View>
        )}
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
        {(movie.release_type === 'theatrical' || movie.release_type === 'ott') &&
          movie.rating > 0 && (
            <View style={[styles.ratingRow, isPast && styles.ratingRowPast]}>
              <Ionicons name="star" size={14} color={colors.yellow400} />
              <Text style={styles.ratingValue}>{movie.rating}</Text>
              <Text style={styles.ratingMax}>/ 5</Text>
            </View>
          )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.zinc900,
    borderColor: colors.white10,
  },
  containerPast: {
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    borderColor: colors.white5,
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
    backgroundColor: colors.red600,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  theaterBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  platformIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformIconText: {
    color: colors.white,
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
    color: colors.white,
    marginBottom: 8,
  },
  titlePast: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  genrePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genrePillPast: {
    backgroundColor: colors.white10,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  genreTextPast: {
    color: colors.white50,
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
    color: colors.white,
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
    color: 'rgba(255, 255, 255, 0.8)',
  },
  ratingMax: {
    fontSize: 12,
    color: colors.white50,
  },
});
