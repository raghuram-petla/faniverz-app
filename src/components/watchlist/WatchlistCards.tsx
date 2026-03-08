import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useWatchlistMutations } from '@/features/watchlist/hooks';
import { deriveMovieStatus } from '@shared/movieStatus';
import { getMovieStatusLabel, getMovieStatusColor } from '@/constants';
import type { WatchlistEntry } from '@/types';
import { getImageUrl } from '@shared/imageUrl';

interface CardProps {
  entry: WatchlistEntry;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

export function AvailableCard({ entry, userId, styles }: CardProps) {
  const router = useRouter();
  const { remove, markWatched } = useWatchlistMutations();
  const movie = entry.movie!;

  const status = deriveMovieStatus(movie, 0);
  const statusLabel = getMovieStatusLabel(status);
  const statusBg = getMovieStatusColor(status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/movie/${movie.id}`)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={movie.title}
    >
      <View style={styles.posterWrapper}>
        <Image
          source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? undefined }}
          style={styles.poster}
          contentFit="cover"
          accessibilityLabel={`${movie.title} poster`}
        />
        <View style={[styles.posterBadge, { backgroundColor: statusBg }]}>
          <Text style={styles.posterBadgeText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {movie.title}
        </Text>
        {movie.rating > 0 && (
          <View style={styles.metaRow}>
            <Ionicons name="star" size={12} color={colors.yellow400} />
            <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
          </View>
        )}
        <View style={styles.genreRow}>
          {movie.genres.slice(0, 2).map((genre) => (
            <Text key={genre} style={styles.genreText}>
              {genre}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => remove.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Remove from watchlist"
        >
          <Ionicons name="trash-outline" size={20} color={colors.red500} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => markWatched.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Mark as watched"
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.green500} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function UpcomingCard({ entry, userId, styles }: CardProps) {
  const router = useRouter();
  const { remove, markWatched } = useWatchlistMutations();
  const movie = entry.movie!;

  const releaseDateFormatted = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'TBA';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/movie/${movie.id}`)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={movie.title}
    >
      <View style={styles.posterWrapper}>
        <Image
          source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? undefined }}
          style={styles.poster}
          contentFit="cover"
          accessibilityLabel={`${movie.title} poster`}
        />
        <View style={[styles.posterBadge, { backgroundColor: colors.blue600 }]}>
          <Text style={styles.posterBadgeText}>Soon</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {movie.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.blue400} />
          <Text style={styles.releaseDateText}>{releaseDateFormatted}</Text>
        </View>
        <View style={styles.genreRow}>
          {movie.genres.slice(0, 2).map((genre) => (
            <Text key={genre} style={styles.genreText}>
              {genre}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => remove.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Remove from watchlist"
        >
          <Ionicons name="trash-outline" size={20} color={colors.red500} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => markWatched.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Mark as watched"
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.green500} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function WatchedCard({ entry, userId, styles }: CardProps) {
  const router = useRouter();
  const { remove, moveBack } = useWatchlistMutations();
  const movie = entry.movie!;

  return (
    <TouchableOpacity
      style={[styles.card, styles.cardWatched]}
      onPress={() => router.push(`/movie/${movie.id}`)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={movie.title}
    >
      <View style={styles.posterWrapper}>
        <Image
          source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? undefined }}
          style={[styles.poster, styles.posterWatched]}
          contentFit="cover"
          accessibilityLabel={`${movie.title} poster`}
        />
      </View>

      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, styles.cardTitleWatched]} numberOfLines={1}>
          {movie.title}
        </Text>
        {movie.rating > 0 && (
          <View style={styles.metaRow}>
            <Ionicons name="star" size={12} color={colors.yellow400} />
            <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
          </View>
        )}
        <View style={styles.genreRow}>
          {movie.genres.slice(0, 2).map((genre) => (
            <Text key={genre} style={styles.genreText}>
              {genre}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => moveBack.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Move back to watchlist"
        >
          <Ionicons name="refresh-outline" size={20} color={colors.blue500} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => remove.mutate({ userId, movieId: movie.id })}
          accessibilityRole="button"
          accessibilityLabel="Remove from watched"
        >
          <Ionicons name="trash-outline" size={20} color={colors.red500} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
