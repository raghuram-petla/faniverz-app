import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { DotType } from '@/types/movie';

interface CalendarDayProps {
  day: number;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  dots: DotType[];
  onPress: () => void;
}

export default function CalendarDay({
  day,
  isToday,
  isSelected,
  isCurrentMonth,
  dots,
  onPress,
}: CalendarDayProps) {
  const { colors } = useTheme();

  const uniqueDots = [...new Set(dots)];

  return (
    <TouchableOpacity
      testID={`calendar-day-${day}`}
      style={[
        styles.container,
        isSelected && { backgroundColor: colors.primary },
        isToday && !isSelected && { borderColor: colors.primary, borderWidth: 1 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.dayText,
          { color: isCurrentMonth ? colors.text : colors.textTertiary },
          isSelected && { color: '#FFFFFF' },
        ]}
      >
        {day}
      </Text>
      {uniqueDots.length > 0 && (
        <View testID={`dots-${day}`} style={styles.dotsContainer}>
          {uniqueDots.map((dotType) => (
            <View
              key={dotType}
              testID={`dot-${dotType}`}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    dotType === 'theatrical'
                      ? colors.dotTheatrical
                      : dotType === 'ott_premiere'
                        ? colors.dotOttPremiere
                        : colors.dotOttOriginal,
                },
              ]}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 48,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
