import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { OTTPlatform } from '@/types';
import { getPlatformLogo } from '@/constants/platformLogos';
import { colors } from '@/theme/colors';

interface PlatformBadgeProps {
  platform: OTTPlatform;
  size?: number;
}

export function PlatformBadge({ platform, size = 24 }: PlatformBadgeProps) {
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
    color: colors.white,
    fontWeight: '700',
  },
});
