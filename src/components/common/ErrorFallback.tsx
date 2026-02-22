import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface ErrorFallbackProps {
  error: Error | null;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export default function ErrorFallback({ error, onRetry, onGoHome }: ErrorFallbackProps) {
  const { colors } = useTheme();

  return (
    <View
      testID="error-fallback"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.icon, { color: colors.error }]}>!</Text>
      <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {error?.message ?? 'An unexpected error occurred.'}
      </Text>
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity
            testID="error-retry"
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onRetry}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        )}
        {onGoHome && (
          <TouchableOpacity
            testID="error-go-home"
            style={[
              styles.button,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
            onPress={onGoHome}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Go Home</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
