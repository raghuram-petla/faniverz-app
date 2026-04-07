import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { OTTPlatform } from '@/types';
import { getPlatformLogo } from '@/constants/platformLogos';
import { isDark } from '@/utils/colorUtils';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';

/**
 * @contract Pressable colored square with platform logo; used on OTT filter/selection screens.
 * @edge Falls back to text initial when logo asset is not registered for this platform.
 */
interface PlatformSquareProps {
  platform: OTTPlatform;
  size: number;
  onPress: () => void;
}

/** @coupling isDark from colorUtils — parses hex color to determine luminance threshold */
export function PlatformSquare({ platform, size, onPress }: PlatformSquareProps) {
  const { theme } = useTheme();
  const logo = getPlatformLogo(platform.id);
  // @boundary Adds visible border only on dark-colored platforms to maintain contrast against dark backgrounds
  const dark = isDark(platform.color);

  return (
    <TouchableOpacity
      style={[
        styles.square,
        {
          backgroundColor: platform.color,
          width: size,
          height: size,
          borderWidth: dark ? 1.5 : 0,
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={platform.name}
    >
      {logo ? (
        <Image
          source={logo}
          style={{ width: size * 0.88, height: size * 0.88, borderRadius: 8 }}
          contentFit="contain"
        />
      ) : platform.logo_url ? (
        <Image
          source={{ uri: platform.logo_url }}
          style={{ width: size * 0.88, height: size * 0.88, borderRadius: 8 }}
          contentFit="contain"
        />
      ) : (
        <Text style={styles.logoText}>{platform.logo}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  square: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.white,
  },
});
