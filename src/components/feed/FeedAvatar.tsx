import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { getImageUrl } from '@shared/imageUrl';
import type { FeedEntityType } from '@shared/types';

export interface FeedAvatarProps {
  imageUrl: string | null;
  entityType: FeedEntityType;
  size?: number;
  label?: string;
  onPress?: () => void;
}

/** @invariant every FeedEntityType must have a fallback icon entry */
const FALLBACK_ICONS: Record<FeedEntityType, React.ComponentProps<typeof Ionicons>['name']> = {
  movie: 'film',
  actor: 'person',
  user: 'person-circle',
  production_house: 'business',
};

/** @contract shape varies by entityType: movie=poster, actor=diamond, user=circle, production_house=rounded square */
export function FeedAvatar({ imageUrl, entityType, size = 52, label, onPress }: FeedAvatarProps) {
  const { theme } = useTheme();
  /** @nullable imageUrl — when null, resolvedUrl is null and fallback icon renders */
  const resolvedUrl = getImageUrl(imageUrl, 'sm');

  const accessLabel = onPress ? `Navigate to ${label ?? 'entity'}` : label;

  const renderContent = () => {
    if (entityType === 'movie') {
      const height = Math.round(size * 1.5);
      return (
        <View
          style={[
            styles.base,
            { width: size, height, borderRadius: 6, backgroundColor: theme.surfaceElevated },
          ]}
          accessibilityLabel={accessLabel}
        >
          {resolvedUrl ? (
            <Image
              source={{ uri: resolvedUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="film" size={size * 0.5} color={theme.textTertiary} />
          )}
        </View>
      );
    }

    if (entityType === 'actor') {
      const outerSize = size;
      /** @sync inner image is 1.42x the outer container to fill the rotated diamond shape */
      const innerSize = Math.round(size * 1.42);
      return (
        <View
          style={[
            styles.base,
            styles.diamondOuter,
            {
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize * 0.2,
              backgroundColor: theme.surfaceElevated,
            },
          ]}
          accessibilityLabel={accessLabel}
        >
          {resolvedUrl ? (
            <Image
              source={{ uri: resolvedUrl }}
              style={[styles.diamondImage, { width: innerSize, height: innerSize }]}
              contentFit="cover"
            />
          ) : (
            <View style={styles.diamondFallback}>
              <Ionicons name="person" size={size * 0.45} color={theme.textTertiary} />
            </View>
          )}
        </View>
      );
    }

    const borderRadius = entityType === 'user' ? size / 2 : size * 0.2;
    return (
      <View
        style={[
          styles.base,
          { width: size, height: size, borderRadius, backgroundColor: theme.surfaceElevated },
        ]}
        accessibilityLabel={accessLabel}
      >
        {resolvedUrl ? (
          <Image source={{ uri: resolvedUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Ionicons
            name={FALLBACK_ICONS[entityType]}
            size={size * 0.5}
            color={theme.textTertiary}
          />
        )}
      </View>
    );
  };

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return renderContent();
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondOuter: {
    transform: [{ rotate: '45deg' }],
  },
  diamondImage: {
    transform: [{ rotate: '-45deg' }],
  },
  diamondFallback: {
    transform: [{ rotate: '-45deg' }],
  },
});
