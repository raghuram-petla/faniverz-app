import { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { useImageViewer } from '@/providers/ImageViewerProvider';
import type { MoviePoster } from '@/types';
import { createStyles } from '@/styles/movieMedia.styles';
import { getImageUrl } from '@shared/imageUrl';

export interface MediaPhotosTabProps {
  posters: MoviePoster[];
}

export function MediaPhotosTab({ posters }: MediaPhotosTabProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const { openImage } = useImageViewer();

  const posterRefs = useRef<Map<string, React.RefObject<View | null>>>(new Map());

  const getRef = useCallback((id: string) => {
    if (!posterRefs.current.has(id)) {
      posterRefs.current.set(id, { current: null });
    }
    return posterRefs.current.get(id)!;
  }, []);

  const handlePosterPress = useCallback(
    (poster: MoviePoster, ref: React.RefObject<View | null>) => {
      if (!ref.current) return;
      ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        openImage({
          feedUrl: getImageUrl(poster.image_url, 'sm') ?? poster.image_url,
          fullUrl: poster.image_url,
          sourceLayout: { x, y, width, height },
          sourceRef: ref,
          borderRadius: 8,
        });
      });
    },
    [openImage],
  );

  if (posters.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No photos available yet</Text>
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
              style={styles.photoCard}
              onPress={() => handlePosterPress(poster, ref)}
              activeOpacity={0.8}
              accessibilityLabel={`View ${poster.title}`}
            >
              <Image
                source={{ uri: getImageUrl(poster.image_url, 'sm') ?? undefined }}
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
