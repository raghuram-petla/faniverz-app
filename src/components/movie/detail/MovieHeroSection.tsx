import { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { getMovieStatusLabel } from '@/constants';
import type { MovieStatus } from '@/types';
import type { MovieWithDetails } from '@/types/movie';
import { createStyles } from '@/styles/movieDetail.styles';
import { useTranslation } from 'react-i18next';
import { getImageUrl, posterBucket, backdropBucket } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { useImageViewer } from '@/providers/ImageViewerProvider';
import { measureView } from '@/utils/measureView';

/** @contract Full-width hero with backdrop, gradient overlay, poster thumbnail, and meta info */
interface MovieHeroSectionProps {
  movie: MovieWithDetails;
  movieStatus: MovieStatus;
  /** @nullable null when release_date is not set (TBA movies) */
  releaseYear: number | null;
}

export function MovieHeroSection({ movie, movieStatus, releaseYear }: MovieHeroSectionProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const { openImage } = useImageViewer();

  const backdropRef = useRef<View | null>(null);
  const posterRef = useRef<View | null>(null);
  const [backdropHidden, setBackdropHidden] = useState(false);
  const [posterHidden, setPosterHidden] = useState(false);

  /** @boundary Determines the correct URL and bucket for the hero backdrop image */
  const backdropUrl = movie.backdrop_url ?? movie.poster_url;
  /** @contract backdrop_image_type === 'backdrop' means landscape; 'poster' means portrait used as backdrop */
  const backdropIsLandscape = movie.backdrop_url ? movie.backdrop_image_type === 'backdrop' : false;
  const heroImageBucket = movie.backdrop_url
    ? backdropBucket(movie.backdrop_image_type)
    : posterBucket(movie.poster_image_type);

  /** @sideeffect Opens full-screen viewer for the backdrop image */
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

  /** @sideeffect Opens full-screen viewer for the poster thumbnail */
  const handlePosterPress = useCallback(() => {
    if (!movie.poster_url) return;
    const bucket = posterBucket(movie.poster_image_type);
    measureView(posterRef, (layout) => {
      openImage({
        feedUrl: getImageUrl(movie.poster_url, 'sm', bucket) ?? movie.poster_url!,
        fullUrl: getImageUrl(movie.poster_url, 'original', bucket) ?? movie.poster_url!,
        sourceLayout: layout,
        sourceRef: posterRef,
        borderRadius: 12,
        isLandscape: false,
        onSourceHide: () => setPosterHidden(true),
        onSourceShow: () => setPosterHidden(false),
      });
    });
  }, [movie.poster_url, movie.poster_image_type, openImage]);

  return (
    <View style={styles.hero}>
      {/** @contract backdrop + gradient confined to heroBackdrop; black bg extends below for info */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleBackdropPress}
        style={styles.heroBackdrop}
        accessibilityLabel="View backdrop image"
      >
        <View
          ref={backdropRef}
          collapsable={false}
          style={[StyleSheet.absoluteFill, backdropHidden && { opacity: 0 }]}
        >
          {/** @nullable backdrop_url/poster_url may be null; cascading fallback to PLACEHOLDER_POSTER */}
          <Image
            source={{
              uri:
                getImageUrl(movie.backdrop_url, 'md', backdropBucket(movie.backdrop_image_type)) ??
                getImageUrl(movie.poster_url, 'md', posterBucket(movie.poster_image_type)) ??
                PLACEHOLDER_POSTER,
            }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            recyclingKey={`hero-${movie.id}`}
            cachePolicy="memory-disk"
            /** @nullable detail_focus_x/y overrides backdrop_focus_x/y; both may be null */
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
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
          locations={[0, 0.2, 0.6, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </TouchableOpacity>

      <View style={styles.heroInfo}>
        <View style={styles.heroInfoRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePosterPress}
            accessibilityLabel="View poster image"
          >
            <View
              ref={posterRef}
              collapsable={false}
              style={posterHidden ? { opacity: 0 } : undefined}
            >
              <Image
                source={{
                  uri:
                    getImageUrl(movie.poster_url, 'sm', posterBucket(movie.poster_image_type)) ??
                    PLACEHOLDER_POSTER,
                }}
                style={styles.heroPoster}
                contentFit="cover"
              />
            </View>
          </TouchableOpacity>
          <View style={styles.heroInfoText}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{getMovieStatusLabel(movieStatus)}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {movie.title}
            </Text>
            {/** @edge rating of 0 means no reviews — entire rating row hidden */}
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
              {/** @nullable releaseYear is null for TBA movies — skip rendering to avoid dangling separator */}
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
      </View>
    </View>
  );
}
