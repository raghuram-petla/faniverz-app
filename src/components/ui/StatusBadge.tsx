import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { MovieStatus } from '@/types';
import { getMovieStatusLabel, getMovieStatusColor } from '@/constants';

interface StatusBadgeProps {
  type: MovieStatus;
}

export function StatusBadge({ type }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: getMovieStatusColor(type) }]}>
      <Text style={styles.text}>{getMovieStatusLabel(type)}</Text>
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
