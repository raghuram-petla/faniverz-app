import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import CalendarDay from './CalendarDay';
import type { CalendarEntry, DotType } from '@/types/movie';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarGridProps {
  month: number;
  year: number;
  selectedDate: Date;
  entriesByDate: Record<string, CalendarEntry[]>;
  onDayPress: (date: Date) => void;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export default function CalendarGrid({
  month,
  year,
  selectedDate,
  entriesByDate,
  onDayPress,
}: CalendarGridProps) {
  const { colors } = useTheme();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const today = new Date();
  const todayStr = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Build grid: 7 columns, up to 6 rows
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const cells: { day: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true });
  }

  // Next month padding
  const remaining = totalCells - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, isCurrentMonth: false });
  }

  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View testID="calendar-grid">
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: colors.textTertiary }]}>{label}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((cell, cellIdx) => {
            const dateKey = cell.isCurrentMonth ? formatDateKey(year, month, cell.day) : '';
            const entries = cell.isCurrentMonth ? (entriesByDate[dateKey] ?? []) : [];
            const dots: DotType[] = entries.map((e) => e.dotType);
            const isToday = cell.isCurrentMonth && dateKey === todayStr;
            const isSelected =
              cell.isCurrentMonth &&
              selectedDate.getDate() === cell.day &&
              selectedDate.getMonth() === month &&
              selectedDate.getFullYear() === year;

            return (
              <CalendarDay
                key={cellIdx}
                day={cell.day}
                isToday={isToday}
                isSelected={isSelected}
                isCurrentMonth={cell.isCurrentMonth}
                dots={dots}
                onPress={() => {
                  if (cell.isCurrentMonth) {
                    onDayPress(new Date(year, month, cell.day));
                  }
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
});
