import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { createStyles } from '@/styles/movieMedia.styles';
import { useTheme } from '@/theme';
import { getImageUrl } from '@shared/imageUrl';
import type { MovieWithDetails } from '@/types/movie';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = 200;

export interface MediaHeroHeaderProps {
  movie: MovieWithDetails;
  videoCount: number;
  photoCount: number;
  scrollOffset: SharedValue<number>;
}

export function MediaHeroHeader({
  movie,
  videoCount,
  photoCount,
  scrollOffset,
}: MediaHeroHeaderProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const imageUri =
    getImageUrl(movie.backdrop_url, 'md') ?? getImageUrl(movie.poster_url, 'md') ?? undefined;

  const contentPosition =
    (movie.detail_focus_x ?? movie.backdrop_focus_x) != null &&
    (movie.detail_focus_y ?? movie.backdrop_focus_y) != null
      ? {
          left: `${Math.round(((movie.detail_focus_x ?? movie.backdrop_focus_x) as number) * 100)}%` as const,
          top: `${Math.round(((movie.detail_focus_y ?? movie.backdrop_focus_y) as number) * 100)}%` as const,
        }
      : undefined;

  const imageAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollOffset.value,
          [0, HERO_HEIGHT],
          [0, -SCREEN_WIDTH * 0.3],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const infoAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollOffset.value, [0, 120], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.heroContainer}>
      <Animated.View style={[StyleSheet.absoluteFill, imageAnimStyle]}>
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={contentPosition}
          recyclingKey={`media-hero-${movie.id}`}
          cachePolicy="memory-disk"
        />
      </Animated.View>
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1)']}
        locations={[0, 0.2, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.heroInfo, infoAnimStyle]}>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {movie.title}
        </Text>
        <Text style={styles.heroSubtitle}>
          {videoCount} Videos · {photoCount} Photos
        </Text>
      </Animated.View>
    </View>
  );
}
