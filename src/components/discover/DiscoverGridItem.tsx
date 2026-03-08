import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PlatformBadge } from '@/components/ui/PlatformBadge';
import { deriveMovieStatus } from '@shared/movieStatus';
import type { Movie, OTTPlatform } from '@/types';
import { getImageUrl } from '@shared/imageUrl';

interface DiscoverGridItemProps {
  item: Movie;
  platforms: OTTPlatform[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

export function DiscoverGridItem({ item, platforms, styles }: DiscoverGridItemProps) {
  const router = useRouter();
  const status = deriveMovieStatus(item, platforms.length);

  return (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => router.push(`/movie/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.gridPoster}>
        <Image
          source={{ uri: getImageUrl(item.poster_url, 'md') ?? undefined }}
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
        {item.rating > 0 && (
          <View style={styles.gridRating}>
            <Ionicons name="star" size={12} color={colors.yellow400} />
            <Text style={styles.gridRatingText}>{item.rating}</Text>
          </View>
        )}
      </View>
      <Text style={styles.gridTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );
}
