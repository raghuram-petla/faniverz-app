import { View, Text, TouchableOpacity } from 'react-native';
import { SORT_OPTIONS } from './DiscoverFilterModal';
import type { SortBy } from '@/stores/useFilterStore';

export interface SortDropdownProps {
  visible: boolean;
  sortBy: SortBy;
  onSelectSort: (value: SortBy) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

export function SortDropdown({ visible, sortBy, onSelectSort, styles }: SortDropdownProps) {
  if (!visible) return null;

  return (
    <View style={styles.sortDropdown}>
      {SORT_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.sortOption, sortBy === opt.value && styles.sortOptionActive]}
          onPress={() => onSelectSort(opt.value as SortBy)}
        >
          <Text
            style={[styles.sortOptionText, sortBy === opt.value && styles.sortOptionTextActive]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
