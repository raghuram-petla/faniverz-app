import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { OttReleaseWithPlatform } from '@/types/ott';

interface WatchOnPlatformProps {
  release: OttReleaseWithPlatform;
}

export default function WatchOnPlatform({ release }: WatchOnPlatformProps) {
  const { colors } = useTheme();

  const handleWatchNow = () => {
    const url = release.deep_link_url || release.platform.base_deep_link;
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <View testID="watch-on-platform" style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.info}>
        <Text testID="platform-name" style={[styles.platformName, { color: colors.text }]}>
          {release.platform.name}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {release.ott_release_date}
        </Text>
        {release.is_exclusive && (
          <Text testID="exclusive-badge" style={[styles.exclusive, { color: colors.accent }]}>
            Exclusive
          </Text>
        )}
      </View>
      <TouchableOpacity
        testID="watch-now-button"
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleWatchNow}
      >
        <Text style={styles.buttonText}>Watch Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
  },
  exclusive: {
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
