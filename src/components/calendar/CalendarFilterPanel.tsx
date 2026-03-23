import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** @contract Three-level date filter: year dropdown + month grid + day horizontal scroll */
interface CalendarFilterPanelProps {
  selectedYear: number | null;
  selectedMonth: number | null;
  selectedDay: number | null;
  years: number[];
  showYearPicker: boolean;
  onToggleYearPicker: () => void;
  onSetDate: (year: number | null, month: number | null, day: number | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

export function CalendarFilterPanel({
  selectedYear,
  selectedMonth,
  selectedDay,
  years,
  showYearPicker,
  onToggleYearPicker,
  onSetDate,
  styles,
}: CalendarFilterPanelProps) {
  const { theme, colors } = useTheme();
  /** @edge when no year is selected, uses current year to compute days-in-month; defaults to 31 when no month selected */
  /** @edge selectedDay may exceed daysInMonth after month change (e.g. day 31 when switching to Feb) — not auto-cleared */
  const daysInMonth =
    selectedMonth !== null && selectedYear !== null
      ? new Date(selectedYear, selectedMonth + 1, 0).getDate()
      : selectedMonth !== null
        ? new Date(new Date().getFullYear(), selectedMonth + 1, 0).getDate()
        : 31;

  return (
    <View style={styles.filterPanel}>
      <Text style={styles.filterLabel}>Year</Text>
      <TouchableOpacity
        style={[styles.yearButton, selectedYear !== null && styles.yearButtonActive]}
        onPress={onToggleYearPicker}
      >
        <Text style={[styles.yearButtonText, selectedYear !== null && styles.yearButtonTextActive]}>
          {selectedYear !== null ? selectedYear : 'All Years'}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={selectedYear !== null ? colors.white : theme.textSecondary}
        />
      </TouchableOpacity>
      {showYearPicker && (
        <ScrollView style={styles.yearDropdown} nestedScrollEnabled>
          <TouchableOpacity
            style={[styles.yearOption, selectedYear === null && styles.yearOptionActive]}
            onPress={() => {
              onSetDate(null, selectedMonth, selectedDay);
              onToggleYearPicker();
            }}
          >
            <Text
              style={[styles.yearOptionText, selectedYear === null && styles.yearOptionTextActive]}
            >
              All Years
            </Text>
          </TouchableOpacity>
          {years.map((y) => (
            <TouchableOpacity
              key={y}
              style={[styles.yearOption, selectedYear === y && styles.yearOptionActive]}
              onPress={() => {
                onSetDate(y, selectedMonth, selectedDay);
                onToggleYearPicker();
              }}
            >
              <Text
                style={[styles.yearOptionText, selectedYear === y && styles.yearOptionTextActive]}
              >
                {y}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={[styles.filterLabel, { marginTop: 16 }]}>Month</Text>
      <View style={styles.monthGrid}>
        {MONTHS.map((month, i) => (
          <TouchableOpacity
            key={month}
            style={[styles.monthButton, selectedMonth === i && styles.monthButtonActive]}
            /** @contract re-tapping the active month deselects it (toggle behavior) */
            onPress={() => onSetDate(selectedYear, selectedMonth === i ? null : i, selectedDay)}
          >
            <Text
              style={[styles.monthButtonText, selectedMonth === i && styles.monthButtonTextActive]}
            >
              {month}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.filterLabel, { marginTop: 16 }]}>Day</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayScroll}
      >
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.dayButton, selectedDay === d && styles.monthButtonActive]}
            onPress={() => onSetDate(selectedYear, selectedMonth, selectedDay === d ? null : d)}
          >
            <Text
              style={[styles.monthButtonText, selectedDay === d && styles.monthButtonTextActive]}
            >
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
