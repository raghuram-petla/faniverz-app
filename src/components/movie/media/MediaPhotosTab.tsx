import { useRef, useCallback, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useImageViewer } from '@/providers/ImageViewerProvider';
import { MediaFilterPills } from '@/components/movie/detail/MediaFilterPills';
import type { MoviePoster } from '@/types';
import { createStyles } from '@/styles/movieMedia.styles';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';

const PHOTO_CATEGORIES = ['All', 'Posters', 'Backdrops'] as const;
type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

/** @contract Grid of movie posters/backdrops with filter pills and tap-to-zoom via ImageViewer */
export interface MediaPhotosTabProps {
  posters: MoviePoster[];
}

export function MediaPhotosTab({ posters }: MediaPhotosTabProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const { openImage } = useImageViewer();

  /** @sync Filter state for photo category pills */
  const [activeCategory, setActiveCategory] = useState<PhotoCategory>('All');

  /** @sync Ref map tracks View refs per poster ID for measuring source layout during zoom transition */
  const posterRefs = useRef<Map<string, React.RefObject<View | null>>>(new Map());
  /** @sideeffect hiddenId hides the source thumbnail while the ImageViewer overlay is active */
  const [hiddenId, setHiddenId] = useState<string | null>(null);

  /** @edge Filters posters by image_type; 'All' returns the full list */
  const filteredPosters = useMemo(() => {
    if (activeCategory === 'All') return posters;
    const typeFilter = activeCategory === 'Posters' ? 'poster' : 'backdrop';
    return posters.filter((p) => p.image_type === typeFilter);
  }, [posters, activeCategory]);

  const getRef = useCallback((id: string) => {
    if (!posterRefs.current.has(id)) {
      posterRefs.current.set(id, { current: null });
    }
    return posterRefs.current.get(id)!;
  }, []);

  /** @boundary Measures source thumbnail in window coords to animate zoom transition */
  const handlePosterPress = useCallback(
    (poster: MoviePoster, ref: React.RefObject<View | null>) => {
      /** @edge ref.current may be null if View unmounted during rapid scrolling */
      if (!ref.current) return;
      ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        openImage({
          feedUrl:
            getImageUrl(
              poster.image_url,
              'sm',
              poster.image_type === 'backdrop' ? 'BACKDROPS' : 'POSTERS',
            ) ?? poster.image_url,
          fullUrl: poster.image_url,
          sourceLayout: { x, y, width, height },
          sourceRef: ref,
          borderRadius: 8,
          onSourceHide: () => setHiddenId(poster.id),
          onSourceShow: () => setHiddenId(null),
        });
      });
    },
    [openImage],
  );

  if (posters.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>{t('discover.noPhotosYet')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.photosTab}>
      <View style={styles.photoFilterPills}>
        <MediaFilterPills
          categories={[...PHOTO_CATEGORIES]}
          active={activeCategory}
          onSelect={(cat) => setActiveCategory(cat as PhotoCategory)}
          theme={theme}
        />
      </View>
      <View style={styles.photoGrid}>
        {filteredPosters.map((poster) => {
          const ref = getRef(poster.id);
          const isBackdrop = poster.image_type === 'backdrop';
          /** @contract Backdrops use 16:9 aspect ratio; posters use 2:3 */
          const aspectRatio = isBackdrop ? 16 / 9 : 2 / 3;
          return (
            <TouchableOpacity
              key={poster.id}
              ref={ref as React.RefObject<View>}
              style={[
                isBackdrop ? styles.photoCardBackdrop : styles.photoCard,
                hiddenId === poster.id && { opacity: 0 },
              ]}
              onPress={() => handlePosterPress(poster, ref)}
              activeOpacity={0.8}
              accessibilityLabel={`View ${poster.title}`}
            >
              <Image
                source={{
                  uri:
                    getImageUrl(poster.image_url, 'sm', isBackdrop ? 'BACKDROPS' : 'POSTERS') ??
                    PLACEHOLDER_POSTER,
                }}
                style={[styles.photoImage, { aspectRatio }]}
                contentFit="cover"
              />
              {poster.is_main_poster && (
                <View style={styles.mainBadge}>
                  <Ionicons name="star" size={10} color={colors.yellow400} />
                  <Text style={styles.mainBadgeText}>Main Poster</Text>
                </View>
              )}
              {poster.is_main_backdrop && (
                <View style={styles.mainBadge}>
                  <Ionicons name="star" size={10} color={colors.blue400} />
                  <Text style={styles.mainBadgeTextBlue}>Main Backdrop</Text>
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.photoOverlay}
              >
                <Text style={styles.photoTitle} numberOfLines={1}>
                  {poster.title}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
