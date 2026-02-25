import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { OTTPlatform } from '@/types';
import { getPlatformLogo } from '@/constants/platformLogos';
import { isDark } from '@/utils/colorUtils';
import { colors } from '@/theme/colors';

interface PlatformSquareProps {
  platform: OTTPlatform;
  size: number;
  onPress: () => void;
}

export function PlatformSquare({ platform, size, onPress }: PlatformSquareProps) {
  const logo = getPlatformLogo(platform.id);
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
          borderColor: 'rgba(255,255,255,0.35)',
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
    color: colors.white,
  },
});
