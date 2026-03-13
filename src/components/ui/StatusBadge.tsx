import { View, Text, StyleSheet } from 'react-native';
import { MovieStatus } from '@/types';
import { getMovieStatusLabel, getMovieStatusColor } from '@/constants';
import { colors as palette } from '@/theme/colors';

/** @coupling getMovieStatusColor/getMovieStatusLabel from constants — must stay in sync with MovieStatus enum */
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
    color: palette.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
