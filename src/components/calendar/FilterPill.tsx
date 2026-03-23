import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { createStyles } from '@/styles/tabs/calendar.styles';

/** @contract Small removable pill with close icon; used for active calendar date filters */
export interface FilterPillProps {
  label: string;
  /** @sideeffect Removes this filter from the calendar filter state */
  onRemove: () => void;
}

export function FilterPill({ label, onRemove }: FilterPillProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
      <TouchableOpacity onPress={onRemove}>
        <Ionicons name="close" size={14} color={colors.red400} />
      </TouchableOpacity>
    </View>
  );
}
