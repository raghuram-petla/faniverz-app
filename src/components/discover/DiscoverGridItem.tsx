import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PlatformBadge } from '@/components/ui/PlatformBadge';
import { deriveMovieStatus } from '@shared/movieStatus';
import type { Movie, OTTPlatform } from '@/types';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { useMovieAction } from '@/hooks/useMovieAction';
import { MovieQuickAction } from '@/components/movie/MovieQuickAction';
import { MovieRating } from '@/components/ui/MovieRating';

interface DiscoverGridItemProps {
  item: Movie;
  platforms: OTTPlatform[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

export function DiscoverGridItem({ item, platforms, styles }: DiscoverGridItemProps) {
  const router = useRouter();
  const status = deriveMovieStatus(item, platforms.length);
  const { actionType, isActive, onPress: handleAction } = useMovieAction(item, platforms.length);

  return (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => router.push(`/movie/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.gridPoster}>
        <Image
          source={{ uri: getImageUrl(item.poster_url, 'md') ?? PLACEHOLDER_POSTER }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <View style={styles.gridBadgeLeft}>
          <StatusBadge type={status} />
        </View>
        {platforms.length > 0 && (
          <View style={styles.gridBadgeRight}>
            {platforms.slice(0, 2).map((p) => (
              <PlatformBadge key={p.id} platform={p} size={22} />
            ))}
          </View>
        )}
        <MovieRating
          rating={item.rating}
          size={12}
          containerStyle={styles.gridRating}
          textStyle={styles.gridRatingText}
        />
        <MovieQuickAction
          actionType={actionType}
          isActive={isActive}
          onPress={handleAction}
          movieTitle={item.title}
        />
      </View>
      <Text style={styles.gridTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );
}
