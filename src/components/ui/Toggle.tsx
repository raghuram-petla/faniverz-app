import { useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function Toggle({ value, onValueChange }: ToggleProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    track: {
      width: 48,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
    },
    trackActive: {
      backgroundColor: palette.red600,
    },
    trackInactive: {
      backgroundColor: t.textDisabled,
    },
    thumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: t.textPrimary,
    },
    thumbActive: {
      transform: [{ translateX: 24 }],
    },
    thumbInactive: {
      transform: [{ translateX: 4 }],
    },
  });
