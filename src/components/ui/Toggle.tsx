import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function Toggle({ value, onValueChange }: ToggleProps) {
  return (
    <TouchableOpacity
      style={[styles.track, value ? styles.trackActive : styles.trackInactive]}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.thumb, value ? styles.thumbActive : styles.thumbInactive]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  trackActive: {
    backgroundColor: colors.red600,
  },
  trackInactive: {
    backgroundColor: colors.white20,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  thumbActive: {
    transform: [{ translateX: 24 }],
  },
  thumbInactive: {
    transform: [{ translateX: 4 }],
  },
});
