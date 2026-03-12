import { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const animationsEnabled = useAnimationsEnabled();

  const iconScale = useSharedValue(animationsEnabled ? 0 : 1);
  const textOpacity = useSharedValue(animationsEnabled ? 0 : 1);

  useEffect(() => {
    if (animationsEnabled) {
      iconScale.value = withSpring(1, { damping: 12, stiffness: 150 });
      textOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    } else {
      iconScale.value = 1;
      textOpacity.value = 1;
    }
  }, [iconScale, textOpacity, animationsEnabled]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, iconAnimStyle]}>
        <Ionicons name={icon} size={40} color={theme.textDisabled} />
      </Animated.View>
      <Animated.View style={textAnimStyle}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {actionLabel && onAction && (
          <TouchableOpacity style={styles.button} onPress={onAction} accessibilityRole="button">
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 48,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: t.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: t.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: t.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      maxWidth: 280,
    },
    button: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: palette.red600,
      borderRadius: 9999,
    },
    buttonText: {
      color: palette.white,
      fontSize: 16,
      fontWeight: '600',
    },
  });
