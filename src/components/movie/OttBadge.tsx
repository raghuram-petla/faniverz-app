import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OttBadgeProps {
  platformName: string;
  color?: string;
}

export default function OttBadge({ platformName, color = '#666666' }: OttBadgeProps) {
  return (
    <View testID="ott-badge" style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{platformName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
