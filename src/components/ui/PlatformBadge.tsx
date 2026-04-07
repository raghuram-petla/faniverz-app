import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { getPlatformLogo } from '@/constants/platformLogos';
import { colors as palette } from '@/theme/colors';

/**
 * @contract Renders a small colored square with platform logo image or text fallback.
 * @coupling getPlatformLogo — returns a local asset require() or null for unknown platforms.
 */
interface PlatformBadgeProps {
  platform: { id: string; color: string; logo: string; logo_url?: string | null };
  size?: number;
}

/** @assumes platform.color is a valid CSS color string — no validation performed */
export function PlatformBadge({ platform, size = 24 }: PlatformBadgeProps) {
  // @edge Falls back to text initial when logo asset is not registered for this platform ID
  const logo = getPlatformLogo(platform.id);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: platform.color,
          width: size,
          height: size,
          borderRadius: 4,
        },
      ]}
    >
      {logo ? (
        <Image
          source={logo}
          style={{ width: size * 0.8, height: size * 0.8 }}
          contentFit="contain"
        />
      ) : platform.logo_url ? (
        <Image
          source={{ uri: platform.logo_url }}
          style={{ width: size * 0.8, height: size * 0.8 }}
          contentFit="contain"
        />
      ) : (
        <Text style={[styles.logo, { fontSize: size * 0.5 }]}>{platform.logo}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: palette.white,
    fontWeight: '700',
  },
});
