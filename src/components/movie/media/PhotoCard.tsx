import { memo, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { useImageViewer } from '@/providers/ImageViewerProvider';
import { measureView } from '@/utils/measureView';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import type { MoviePoster } from '@/types';

/** @contract Props for a single photo card in the media grid */
export interface PhotoCardProps {
  poster: MoviePoster;
  cardStyle: Record<string, unknown>;
  imageStyle: Record<string, unknown>;
  overlayStyle: Record<string, unknown>;
  titleStyle: Record<string, unknown>;
  badgeStyle: Record<string, unknown>;
  badgeTextStyle: Record<string, unknown>;
  badgeTextBlueStyle: Record<string, unknown>;
  isHidden: boolean;
  /** @sideeffect Called by ImageViewer when overlay opens — hides source thumbnail */
  onSourceHide: (id: string) => void;
  /** @sideeffect Called by ImageViewer when overlay closes — shows source thumbnail */
  onSourceShow: () => void;
}

/** @contract Memoized photo card — only re-renders when poster data or visibility changes */
export const PhotoCard = memo(function PhotoCard({
  poster,
  cardStyle,
  imageStyle,
  overlayStyle,
  titleStyle,
  badgeStyle,
  badgeTextStyle,
  badgeTextBlueStyle,
  isHidden,
  onSourceHide,
  onSourceShow,
}: PhotoCardProps) {
  const { openImage } = useImageViewer();
  const viewRef = useRef<View | null>(null);

  const isBackdrop = poster.image_type === 'backdrop';
  const imageBucket = isBackdrop ? 'BACKDROPS' : 'POSTERS';
  /** @contract Backdrops use 16:9; posters use 2:3 */
  const aspectRatio = isBackdrop ? 16 / 9 : 2 / 3;

  /** @boundary Measures source thumbnail position for zoom animation */
  const handlePress = useCallback(() => {
    measureView(viewRef, (layout) => {
      openImage({
        feedUrl:
          getImageUrl(poster.image_url, 'md', imageBucket) ??
          /* istanbul ignore next */ poster.image_url,
        fullUrl:
          getImageUrl(poster.image_url, 'original', imageBucket) ??
          /* istanbul ignore next */ poster.image_url,
        sourceLayout: layout,
        sourceRef: viewRef,
        borderRadius: 0,
        isLandscape: isBackdrop,
        onSourceHide: () => onSourceHide(poster.id),
        onSourceShow,
      });
    });
  }, [poster.image_url, poster.id, imageBucket, isBackdrop, openImage, onSourceHide, onSourceShow]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      accessibilityLabel={`View ${poster.title}`}
    >
      <View
        ref={viewRef}
        collapsable={false}
        style={[cardStyle, isHidden && /* istanbul ignore next */ { opacity: 0 }]}
      >
        <Image
          source={{
            uri:
              getImageUrl(poster.image_url, 'md', isBackdrop ? 'BACKDROPS' : 'POSTERS') ??
              PLACEHOLDER_POSTER,
          }}
          style={[imageStyle, { aspectRatio }]}
          contentFit="cover"
          recyclingKey={`media-photo-${poster.id}`}
        />
        {poster.is_main_poster && (
          <View style={badgeStyle}>
            <Ionicons name="star" size={10} color={colors.yellow400} />
            <Text style={badgeTextStyle}>Main Poster</Text>
          </View>
        )}
        {poster.is_main_backdrop && (
          <View style={badgeStyle}>
            <Ionicons name="star" size={10} color={colors.blue400} />
            <Text style={badgeTextBlueStyle}>Main Backdrop</Text>
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={overlayStyle}>
          <Text style={titleStyle} numberOfLines={1}>
            {poster.title}
          </Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
});
