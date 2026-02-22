import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface CalendarHeaderProps {
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function CalendarHeader({ month, year, onPrev, onNext }: CalendarHeaderProps) {
  const { colors } = useTheme();

  return (
    <View testID="calendar-header" style={styles.container}>
      <TouchableOpacity testID="prev-month" onPress={onPrev} style={styles.arrow}>
        <Text style={[styles.arrowText, { color: colors.primary }]}>‹</Text>
      </TouchableOpacity>
      <Text testID="month-year" style={[styles.title, { color: colors.text }]}>
        {MONTH_NAMES[month]} {year}
      </Text>
      <TouchableOpacity testID="next-month" onPress={onNext} style={styles.arrow}>
        <Text style={[styles.arrowText, { color: colors.primary }]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  arrow: {
    padding: 8,
  },
  arrowText: {
    fontSize: 28,
    fontWeight: '300',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
