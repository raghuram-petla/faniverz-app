import { useRef, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useImageViewer } from '@/providers/ImageViewerProvider';
import type { MoviePoster } from '@/types';
import { createStyles } from '@/styles/movieMedia.styles';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';

/** @contract Grid of movie posters with tap-to-zoom via ImageViewer provider */
export interface MediaPhotosTabProps {
  posters: MoviePoster[];
}

export function MediaPhotosTab({ posters }: MediaPhotosTabProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const { openImage } = useImageViewer();

  /** @sync Ref map tracks View refs per poster ID for measuring source layout during zoom transition */
  const posterRefs = useRef<Map<string, React.RefObject<View | null>>>(new Map());
  /** @sideeffect hiddenId hides the source thumbnail while the ImageViewer overlay is active */
  const [hiddenId, setHiddenId] = useState<string | null>(null);

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
          feedUrl: getImageUrl(poster.image_url, 'sm', 'POSTERS') ?? poster.image_url,
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
      <View style={styles.photoGrid}>
        {posters.map((poster) => {
          const ref = getRef(poster.id);
          return (
            <TouchableOpacity
              key={poster.id}
              ref={ref as React.RefObject<View>}
              style={[styles.photoCard, hiddenId === poster.id && { opacity: 0 }]}
              onPress={() => handlePosterPress(poster, ref)}
              activeOpacity={0.8}
              accessibilityLabel={`View ${poster.title}`}
            >
              <Image
                source={{
                  uri: getImageUrl(poster.image_url, 'sm', 'POSTERS') ?? PLACEHOLDER_POSTER,
                }}
                style={styles.photoImage}
                contentFit="cover"
              />
              {poster.is_main && (
                <View style={styles.mainBadge}>
                  <Ionicons name="star" size={10} color={colors.yellow400} />
                  <Text style={styles.mainBadgeText}>Main</Text>
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
