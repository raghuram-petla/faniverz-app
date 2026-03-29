import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { HomeButton } from '@/components/common/HomeButton';
import { AnimatedTabBar } from '@/components/ui/AnimatedTabBar';
import ScreenHeader from '@/components/common/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMovieDetail } from '@/features/movies/hooks/useMovieDetail';
import { VIDEO_TYPES } from '@shared/constants';
import { MediaHeroHeader } from '@/components/movie/media/MediaHeroHeader';
import { MediaVideosTab } from '@/components/movie/media/MediaVideosTab';
import { MediaPhotosTab } from '@/components/movie/media/MediaPhotosTab';
import { MediaFilterPills } from '@/components/movie/detail/MediaFilterPills';
import {
  createStyles,
  HERO_HEIGHT,
  POSTER_EXPANDED_W,
  POSTER_EXPANDED_H,
  POSTER_COLLAPSED_W,
  NAV_ROW_HEIGHT,
  TITLE_SCALE,
} from '@/styles/movieMedia.styles';
import { useSnapScroll } from '@/hooks/useSnapScroll';
import { useTheme } from '@/theme';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import type { MovieVideo } from '@/types';

type MediaTabName = 'videos' | 'photos';
const COLLAPSED_GAP = 8;

// @boundary: Media gallery — videos (grouped by type) and photos for a single movie
// @coupling: VIDEO_TYPES from shared constants, useMovieDetail for videos + posters data
export default function MediaScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // @boundary: id from URL param — empty string returns null from API
  const { data: movie, isLoading } = useMovieDetail(id ?? '');

  const [activeTab, setActiveTab] = useState<MediaTabName>('photos');
  // @invariant: 'All' must be the first category; other categories are derived from VIDEO_TYPES
  const [activeCategory, setActiveCategory] = useState('All');
  const scrollOffset = useSharedValue(0);
  const titleWidth = useSharedValue(200);
  const titleHeight = useSharedValue(24);
  const {
    scrollRef,
    contentMinHeight,
    handleLayout,
    handleScroll,
    handleScrollEndDrag,
    handleMomentumEnd,
  } = useSnapScroll({ scrollOffset, snapThreshold: HERO_HEIGHT });

  const onTitleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      titleWidth.value = e.nativeEvent.layout.width;
      titleHeight.value = e.nativeEvent.layout.height;
    },
    [titleWidth, titleHeight],
  );

  // @coupling: VIDEO_TYPES from shared constants defines the canonical video type ordering
  // @edge: types with zero matching videos are excluded from the grouped result
  const videosByType = useMemo(() => {
    if (!movie) return [];
    return VIDEO_TYPES.reduce<{ label: string; videos: MovieVideo[] }[]>((acc, vt) => {
      const matches = movie.videos.filter((v) => v.video_type === vt.value);
      if (matches.length > 0) acc.push({ label: vt.label, videos: matches });
      return acc;
    }, []);
  }, [movie]);

  const categories = useMemo(
    () => ['All', ...videosByType.map((g) => `${g.label} (${g.videos.length})`)],
    [videosByType],
  );

  // @contract: strips the count suffix "(N)" from the category pill label for comparison
  const activeCategoryLabel =
    activeCategory === 'All' ? 'All' : activeCategory.replace(/\s*\(\d+\)$/, '');

  // --- Animation geometry ---
  // @assumes floating elements are position:absolute inside a View with paddingTop:insets.top.
  // Absolute children ignore padding, so all Y coords must include insets.top manually.
  const heroPosterCX = 16 + POSTER_EXPANDED_W / 2;
  const heroPosterCY = insets.top + HERO_HEIGHT - 16 - POSTER_EXPANDED_H / 2;
  // Collapsed: nav row sits below the safe area inset
  const navCenterY = insets.top + NAV_ROW_HEIGHT / 2;

  // @boundary: p interpolates [0,1] over HERO_HEIGHT; clamped so over-scroll has no effect
  const animatedPosterStyle = useAnimatedStyle(() => {
    const s = scrollOffset.value;
    const p = interpolate(s, [0, HERO_HEIGHT], [0, 1], Extrapolation.CLAMP);

    const titleVisualW = titleWidth.value * TITLE_SCALE;
    const groupW = POSTER_COLLAPSED_W + COLLAPSED_GAP + titleVisualW;
    const groupLeft = (screenWidth - groupW) / 2;
    const collapsedCX = groupLeft + POSTER_COLLAPSED_W / 2;

    const cy = (heroPosterCY - s) * (1 - p) + navCenterY * p;
    const cx = heroPosterCX * (1 - p) + collapsedCX * p;
    const scale = interpolate(p, [0, 1], [1, POSTER_COLLAPSED_W / POSTER_EXPANDED_W]);

    return {
      transform: [
        { translateX: cx - POSTER_EXPANDED_W / 2 },
        { translateY: cy - POSTER_EXPANDED_H / 2 },
        { scale },
      ],
    };
  });

  const animatedTitleStyle = useAnimatedStyle(() => {
    const s = scrollOffset.value;
    const p = interpolate(s, [0, HERO_HEIGHT], [0, 1], Extrapolation.CLAMP);

    const W = titleWidth.value;
    const H = titleHeight.value;
    const scale = interpolate(p, [0, 1], [1, TITLE_SCALE]);

    const titleVisualW = W * TITLE_SCALE;
    const groupW = POSTER_COLLAPSED_W + COLLAPSED_GAP + titleVisualW;
    const groupLeft = (screenWidth - groupW) / 2;
    const collapsedNameCX = groupLeft + POSTER_COLLAPSED_W + COLLAPSED_GAP + titleVisualW / 2;

    // Hero: to the right of poster, vertically centered with poster bottom half
    const heroTitleCY = heroPosterCY + POSTER_EXPANDED_H * 0.15;
    const cy = (heroTitleCY - s) * (1 - p) + navCenterY * p;

    const heroTX = heroPosterCX + POSTER_EXPANDED_W / 2 + 12;
    const collapsedTX = collapsedNameCX - W / 2;

    return {
      transform: [
        { translateX: heroTX * (1 - p) + collapsedTX * p },
        { translateY: cy - H / 2 },
        { scale },
      ],
    };
  });

  /** @sideeffect Subtitle fades out in first half of scroll transition */
  const subtitleFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollOffset.value, [0, HERO_HEIGHT * 0.4], [1, 0], Extrapolation.CLAMP),
  }));

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title={t('movieDetail.media')} />
        <ActivityIndicator size="large" color={theme.textPrimary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title={t('movieDetail.media')} />
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textTertiary} />
          <Text style={{ color: theme.textTertiary, marginTop: 8, fontSize: 16 }}>
            {t('common.noResults')}
          </Text>
        </View>
      </View>
    );
  }

  const posterUri = getImageUrl(movie.poster_url, 'sm', 'POSTERS') ?? PLACEHOLDER_POSTER;
  const videoCount = movie.videos.length;
  const photoCount = movie.posters.length;
  const mediaTabs: MediaTabName[] = ['photos', 'videos'];
  const mediaTabLabels: Record<MediaTabName, string> = {
    photos: `${t('movieDetail.photos')} (${photoCount})`,
    videos: `${t('movieDetail.videos')} (${videoCount})`,
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Floating poster — animates from hero to nav bar */}
      <Animated.View
        style={[styles.floatingPoster, animatedPosterStyle]}
        pointerEvents="none"
        testID="floating-poster"
      >
        <Image
          source={{ uri: posterUri }}
          style={styles.floatingPosterImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </Animated.View>

      {/* Floating title — animates from hero to nav bar */}
      <Animated.View
        style={[styles.floatingTitle, animatedTitleStyle]}
        pointerEvents="none"
        testID="floating-title"
      >
        <Text style={styles.floatingTitleText} numberOfLines={1} onLayout={onTitleLayout}>
          {movie.title}
        </Text>
        <Animated.Text style={[styles.floatingSubtitle, subtitleFadeStyle]}>
          {videoCount} {videoCount !== 1 ? t('movieDetail.videos') : t('movieDetail.video')} ·{' '}
          {photoCount} {photoCount !== 1 ? t('movieDetail.photos') : t('movieDetail.photo')}
        </Animated.Text>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef as React.RefObject<Animated.ScrollView>}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ minHeight: contentMinHeight }}
        onLayout={handleLayout}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <MediaHeroHeader movie={movie} scrollOffset={scrollOffset} />

        <View style={styles.stickyContainer}>
          <View style={styles.stickyNavRow}>
            <View style={styles.stickyNavLeft}>
              <TouchableOpacity
                style={styles.stickyNavButton}
                onPress={() => router.back()}
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
              <HomeButton forceShow style={styles.stickyNavButton} />
            </View>
            <View style={styles.stickyNavPlaceholder} />
            <View style={styles.stickyNavRight} />
          </View>

          <View style={styles.tabBarWrap}>
            <AnimatedTabBar
              tabs={mediaTabs}
              labels={mediaTabLabels}
              activeTab={activeTab}
              onTabPress={setActiveTab}
            />
          </View>

          {activeTab === 'videos' && videosByType.length > 0 && (
            <View style={styles.filterPillsContainer}>
              <MediaFilterPills
                categories={categories}
                active={activeCategory}
                onSelect={setActiveCategory}
              />
            </View>
          )}
        </View>

        <View style={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
          {activeTab === 'videos' ? (
            <MediaVideosTab videosByType={videosByType} activeCategory={activeCategoryLabel} />
          ) : (
            <MediaPhotosTab posters={movie.posters} />
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}
