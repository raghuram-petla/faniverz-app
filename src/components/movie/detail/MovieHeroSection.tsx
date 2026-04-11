import { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import type { MovieStatus } from '@/types';
import type { MovieWithDetails } from '@/types/movie';
import { createStyles } from '@/styles/movieDetail.styles';
import { useTranslation } from 'react-i18next';
import { getImageUrl, posterBucket, backdropBucket } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { useImageViewer } from '@/providers/ImageViewerProvider';
import { measureView } from '@/utils/measureView';
import { DETAIL_SCROLL_THRESHOLD } from '@/hooks/useDetailScrollAnimations';

/**
 * @contract Backdrop-only hero with gradient overlay and meta info that fades on scroll.
 * Poster + title are floating elements in the parent (index.tsx).
 */
interface MovieHeroSectionProps {
  movie: MovieWithDetails;
  movieStatus: MovieStatus;
  /** @nullable null when release_date is not set (TBA movies) */
  releaseYear: number | null;
  /** @coupling scrollOffset shared value from parent drives fade animations */
  scrollOffset: SharedValue<number>;
  /** @sideeffect Animated style that fades hero info during scroll */
  heroInfoFadeStyle: { opacity: number };
}

export function MovieHeroSection({
  movie,
  movieStatus,
  releaseYear,
  scrollOffset,
  heroInfoFadeStyle,
}: MovieHeroSectionProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const { openImage } = useImageViewer();

  const backdropRef = useRef<View | null>(null);
  const [backdropHidden, setBackdropHidden] = useState(false);

  const backdropUrl = movie.backdrop_url ?? movie.poster_url;
  const backdropIsLandscape = movie.backdrop_url ? movie.backdrop_image_type === 'backdrop' : false;
  const heroImageBucket = movie.backdrop_url
    ? backdropBucket(movie.backdrop_image_type)
    : posterBucket(movie.poster_image_type);

  const handleBackdropPress = useCallback(() => {
    if (!backdropUrl) return;
    measureView(backdropRef, (layout) => {
      openImage({
        feedUrl: getImageUrl(backdropUrl, 'md', heroImageBucket) ?? backdropUrl,
        fullUrl: getImageUrl(backdropUrl, 'original', heroImageBucket) ?? backdropUrl,
        sourceLayout: layout,
        sourceRef: backdropRef,
        borderRadius: 0,
        isLandscape: backdropIsLandscape,
        onSourceHide: () => setBackdropHidden(true),
        onSourceShow: () => setBackdropHidden(false),
      });
    });
  }, [backdropUrl, heroImageBucket, backdropIsLandscape, openImage]);

  /** @sideeffect Backdrop fades out and slides up as user scrolls */
  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollOffset.value,
      [0, DETAIL_SCROLL_THRESHOLD * 0.8],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollOffset.value,
          [0, DETAIL_SCROLL_THRESHOLD],
          [0, -40],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={styles.hero}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleBackdropPress}
        style={styles.heroBackdrop}
        accessibilityLabel="View backdrop image"
      >
        <Animated.View style={[StyleSheet.absoluteFill, backdropAnimStyle]}>
          <View
            ref={backdropRef}
            collapsable={false}
            style={[StyleSheet.absoluteFill, backdropHidden && { opacity: 0 }]}
          >
            <Image
              source={{
                uri:
                  getImageUrl(
                    movie.backdrop_url,
                    'md',
                    backdropBucket(movie.backdrop_image_type),
                  ) ??
                  getImageUrl(movie.poster_url, 'md', posterBucket(movie.poster_image_type)) ??
                  PLACEHOLDER_POSTER,
              }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              recyclingKey={`hero-${movie.id}`}
              cachePolicy="memory-disk"
              contentPosition={
                (movie.detail_focus_x ?? movie.backdrop_focus_x) != null &&
                (movie.detail_focus_y ?? movie.backdrop_focus_y) != null
                  ? {
                      left: `${Math.round(((movie.detail_focus_x ?? movie.backdrop_focus_x) as number) * 100)}%`,
                      top: `${Math.round(((movie.detail_focus_y ?? movie.backdrop_focus_y) as number) * 100)}%`,
                    }
                  : undefined
              }
            />
          </View>
        </Animated.View>
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
          locations={[0, 0.2, 0.6, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </TouchableOpacity>

      {/* Hero info: rating, meta — fades out during scroll. Poster/title are floating. */}
      <Animated.View style={[styles.heroInfo, heroInfoFadeStyle]}>
        <View style={styles.heroInfoRow}>
          {/* Spacer for where floating poster sits */}
          <View style={styles.heroPoster} />
          <View style={styles.heroInfoText}>
            {/* Spacer for floating badge + title */}
            <View style={{ height: 72 }} />
            {movie.rating > 0 && (
              <View style={styles.heroRatingRow}>
                <Ionicons name="star" size={20} color={colors.yellow400} />
                <Text style={styles.heroRatingValue}>{movie.rating}</Text>
                <Text style={styles.heroReviewCount}>
                  {t('movie.reviewCountLabel', { count: movie.review_count })}
                </Text>
              </View>
            )}
            <View style={styles.heroMetaRow}>
              {releaseYear != null && <Text style={styles.heroMeta}>{releaseYear}</Text>}
              {movie.runtime ? (
                <>
                  {releaseYear != null && <Text style={styles.heroMetaDot}>|</Text>}
                  <Text style={styles.heroMeta}>{movie.runtime}m</Text>
                </>
              ) : null}
              {movie.certification && (
                <>
                  <Text style={styles.heroMetaDot}>|</Text>
                  <Text style={styles.heroMeta}>{movie.certification}</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
