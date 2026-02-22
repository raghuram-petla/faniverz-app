import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { ReleaseTypeFilter } from '@/stores/useFilterStore';

interface CalendarFilterProps {
  selected: ReleaseTypeFilter;
  onChange: (filter: ReleaseTypeFilter) => void;
}

const SEGMENTS: { value: ReleaseTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'theatrical', label: 'Theatrical' },
  { value: 'ott', label: 'OTT' },
];

export default function CalendarFilter({ selected, onChange }: CalendarFilterProps) {
  const { colors } = useTheme();

  return (
    <View testID="calendar-filter" style={[styles.container, { borderColor: colors.border }]}>
      {SEGMENTS.map((segment) => {
        const isActive = selected === segment.value;
        return (
          <TouchableOpacity
            key={segment.value}
            testID={`filter-${segment.value}`}
            style={[styles.segment, isActive && { backgroundColor: colors.primary }]}
            onPress={() => onChange(segment.value)}
          >
            <Text style={[styles.label, { color: isActive ? '#FFFFFF' : colors.text }]}>
              {segment.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
