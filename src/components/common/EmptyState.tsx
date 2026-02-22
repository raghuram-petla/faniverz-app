import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  ctaLabel,
  onCtaPress,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View testID="empty-state" style={styles.container}>
      {icon && <Text style={[styles.icon, { color: colors.textTertiary }]}>{icon}</Text>}
      <Text testID="empty-state-title" style={[styles.title, { color: colors.text }]}>
        {title}
      </Text>
      {subtitle && (
        <Text
          testID="empty-state-subtitle"
          style={[styles.subtitle, { color: colors.textSecondary }]}
        >
          {subtitle}
        </Text>
      )}
      {ctaLabel && onCtaPress && (
        <TouchableOpacity
          testID="empty-state-cta"
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={onCtaPress}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export const EMPTY_WATCHLIST = {
  icon: '📋',
  title: 'Your watchlist is empty',
  subtitle: 'Add movies to your watchlist to track upcoming releases.',
  ctaLabel: 'Browse Movies',
};

export const EMPTY_REVIEWS = {
  icon: '✍️',
  title: 'No reviews yet',
  subtitle: 'Be the first to share your thoughts about this movie.',
  ctaLabel: 'Write a Review',
};

export const EMPTY_SEARCH = {
  icon: '🔍',
  title: 'No results found',
  subtitle: 'Try a different search term.',
};

export const EMPTY_CALENDAR_DAY = {
  icon: '📅',
  title: 'No releases this day',
  subtitle: 'Check other dates for upcoming movies.',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
