import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { createStyles, HERO_HEIGHT } from '@/styles/movieMedia.styles';
import { useTheme } from '@/theme';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import type { MovieWithDetails } from '@/types/movie';

/**
 * @contract Backdrop-only hero that fades up and away on scroll.
 * Poster + title are floating elements in the parent (media.tsx).
 * @coupling scrollOffset shared value from parent drives the fade-up animation.
 */
export interface MediaHeroHeaderProps {
  movie: MovieWithDetails;
  /** @coupling scrollOffset is a shared Reanimated value from the parent ScrollView */
  scrollOffset: SharedValue<number>;
}

export function MediaHeroHeader({ movie, scrollOffset }: MediaHeroHeaderProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const imageUri =
    getImageUrl(movie.backdrop_url, 'md', 'BACKDROPS') ??
    getImageUrl(movie.poster_url, 'md', 'POSTERS') ??
    PLACEHOLDER_POSTER;

  /** @nullable Focus point overrides; both axes must be non-null for contentPosition to apply */
  const contentPosition =
    (movie.detail_focus_x ?? movie.backdrop_focus_x) != null &&
    (movie.detail_focus_y ?? movie.backdrop_focus_y) != null
      ? {
          left: `${Math.round(((movie.detail_focus_x ?? movie.backdrop_focus_x) as number) * 100)}%` as const,
          top: `${Math.round(((movie.detail_focus_y ?? movie.backdrop_focus_y) as number) * 100)}%` as const,
        }
      : undefined;

  /** @sideeffect Backdrop fades out and slides up as user scrolls */
  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollOffset.value, [0, HERO_HEIGHT * 0.8], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollOffset.value,
          [0, HERO_HEIGHT],
          [0, -40],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={styles.heroContainer}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropAnimStyle]}>
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
    </View>
  );
}
