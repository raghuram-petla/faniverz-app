import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { ReleaseType } from '@/types';
import { getReleaseTypeLabel, getReleaseTypeColor } from '@/constants/releaseType';

interface StatusBadgeProps {
  type: ReleaseType;
}

export function StatusBadge({ type }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: getReleaseTypeColor(type) }]}>
      <Text style={styles.text}>{getReleaseTypeLabel(type)}</Text>
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
