import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
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
import { createStyles } from '@/styles/movieMedia.styles';
import { useTheme } from '@/theme';
import type { MovieVideo } from '@/types';

type MediaTabName = 'videos' | 'photos';

export default function MediaScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: movie, isLoading } = useMovieDetail(id ?? '');

  const [activeTab, setActiveTab] = useState<MediaTabName>('videos');
  const [activeCategory, setActiveCategory] = useState('All');
  const scrollOffset = useSharedValue(0);

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

  const activeCategoryLabel =
    activeCategory === 'All' ? 'All' : activeCategory.replace(/\s*\(\d+\)$/, '');

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.value = e.nativeEvent.contentOffset.y;
    },
    [scrollOffset],
  );

  const titleFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollOffset.value, [80, 160], [0, 1], Extrapolation.CLAMP),
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

  const videoCount = movie.videos.length;
  const photoCount = movie.posters.length;
  const mediaTabs: MediaTabName[] = ['videos', 'photos'];
  const mediaTabLabels: Record<MediaTabName, string> = {
    videos: `${t('movieDetail.videos')} (${videoCount})`,
    photos: `${t('movieDetail.photos')} (${photoCount})`,
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        stickyHeaderIndices={[1]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <MediaHeroHeader
          movie={movie}
          videoCount={videoCount}
          photoCount={photoCount}
          scrollOffset={scrollOffset}
        />

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
            <Animated.View style={[styles.stickyTitleWrap, titleFadeStyle]}>
              <Text style={styles.stickyTitle} numberOfLines={1}>
                {movie.title}
              </Text>
            </Animated.View>
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
                theme={theme}
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
      </ScrollView>
    </View>
  );
}
