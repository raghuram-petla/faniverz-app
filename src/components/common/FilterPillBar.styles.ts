import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

export const createFilterPillBarStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 0,
      backgroundColor: t.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
      flexDirection: 'row',
    },
    pill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    pillInactive: {
      backgroundColor: t.surfaceElevated,
      borderColor: t.inputActive,
    },
    pillText: {
      fontSize: 14,
      fontWeight: '500',
      color: t.textSecondary,
    },
    pillTextActive: {
      color: colors.white,
    },
  });
