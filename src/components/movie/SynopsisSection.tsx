import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface SynopsisSectionProps {
  overview: string | null;
  overviewTe: string | null;
}

const MAX_LINES = 4;

export default function SynopsisSection({ overview, overviewTe }: SynopsisSectionProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const text = overviewTe || overview;

  if (!text) return null;

  return (
    <View testID="synopsis-section" style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Synopsis</Text>
      <Text
        testID="synopsis-text"
        style={[styles.text, { color: colors.textSecondary }]}
        numberOfLines={expanded ? undefined : MAX_LINES}
      >
        {text}
      </Text>
      <TouchableOpacity testID="synopsis-toggle" onPress={() => setExpanded(!expanded)}>
        <Text style={[styles.toggle, { color: colors.primary }]}>
          {expanded ? 'Read less' : 'Read more'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
  toggle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
});
