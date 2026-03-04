import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={48} color={palette.red500} />
      <Text style={styles.title}>Something went wrong</Text>
      {error?.message && <Text style={styles.message}>{error.message}</Text>}
      <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: t.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: t.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    button: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: palette.red600,
      borderRadius: 12,
    },
    buttonText: {
      color: palette.white,
      fontSize: 16,
      fontWeight: '600',
    },
  });
