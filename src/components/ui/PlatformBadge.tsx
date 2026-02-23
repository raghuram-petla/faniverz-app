import { View, Text, StyleSheet } from 'react-native';
import { OTTPlatform } from '@/types';

interface PlatformBadgeProps {
  platform: OTTPlatform;
  size?: number;
}

export function PlatformBadge({ platform, size = 24 }: PlatformBadgeProps) {
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
      <Text style={[styles.logo, { fontSize: size * 0.5 }]}>{platform.logo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: '#fff',
    fontWeight: '700',
  },
});
