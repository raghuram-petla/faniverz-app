import { View, StyleSheet } from 'react-native';
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
}

const FALLBACK_ICONS: Record<FeedEntityType, React.ComponentProps<typeof Ionicons>['name']> = {
  movie: 'film',
  actor: 'person',
  user: 'person-circle',
  production_house: 'business',
};

export function FeedAvatar({ imageUrl, entityType, size = 52, label }: FeedAvatarProps) {
  const { theme } = useTheme();
  const resolvedUrl = getImageUrl(imageUrl, 'sm');

  if (entityType === 'movie') {
    const height = Math.round(size * 1.5); // 2:3 poster aspect ratio
    return (
      <View
        style={[
          styles.base,
          { width: size, height, borderRadius: 6, backgroundColor: theme.surfaceElevated },
        ]}
        accessibilityLabel={label}
      >
        {resolvedUrl ? (
          <Image source={{ uri: resolvedUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Ionicons name="film" size={size * 0.5} color={theme.textTertiary} />
        )}
      </View>
    );
  }

  if (entityType === 'actor') {
    const outerSize = size;
    const innerSize = Math.round(size * 1.42); // sqrt(2) ≈ 1.414 to fill rotated square
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
        accessibilityLabel={label}
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

  // user = circle, production_house = square
  const borderRadius = entityType === 'user' ? size / 2 : size * 0.2;

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius, backgroundColor: theme.surfaceElevated },
      ]}
      accessibilityLabel={label}
    >
      {resolvedUrl ? (
        <Image source={{ uri: resolvedUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Ionicons name={FALLBACK_ICONS[entityType]} size={size * 0.5} color={theme.textTertiary} />
      )}
    </View>
  );
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
