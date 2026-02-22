import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { DotType } from '@/types/movie';

interface ReleaseTypeBadgeProps {
  dotType: DotType;
}

const LABELS: Record<DotType, string> = {
  theatrical: 'Theatrical',
  ott_premiere: 'OTT Premiere',
  ott_original: 'OTT Original',
};

export default function ReleaseTypeBadge({ dotType }: ReleaseTypeBadgeProps) {
  const { colors } = useTheme();

  const badgeColor =
    dotType === 'theatrical'
      ? colors.dotTheatrical
      : dotType === 'ott_premiere'
        ? colors.dotOttPremiere
        : colors.dotOttOriginal;

  return (
    <View testID="release-type-badge" style={[styles.badge, { backgroundColor: badgeColor }]}>
      <Text style={styles.label}>{LABELS[dotType]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
