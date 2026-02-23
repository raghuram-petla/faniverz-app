import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { ReleaseType } from '@/types';

const statusConfig: Record<ReleaseType, { bg: string; label: string }> = {
  theatrical: { bg: colors.red600, label: 'In Theaters' },
  ott: { bg: colors.purple600, label: 'Streaming' },
  upcoming: { bg: colors.blue600, label: 'Coming Soon' },
};

interface StatusBadgeProps {
  type: ReleaseType;
}

export function StatusBadge({ type }: StatusBadgeProps) {
  const config = statusConfig[type];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={styles.text}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
