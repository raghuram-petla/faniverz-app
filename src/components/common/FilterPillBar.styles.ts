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
      paddingBottom: 8,
      gap: 8,
      flexDirection: 'row',
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    pillInactive: {
      backgroundColor: t.surfaceElevated,
      borderColor: t.inputActive,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '500',
      color: t.textPrimary,
    },
    pillTextActive: {
      color: colors.white,
    },
  });
