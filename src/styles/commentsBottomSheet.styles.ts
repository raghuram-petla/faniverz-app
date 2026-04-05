import { StyleSheet } from 'react-native';
import type { SemanticTheme } from '@shared/themes';

export const createCommentsSheetStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: t.surface,
      overflow: 'hidden',
    },
    headerPanel: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    dragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.textTertiary,
      opacity: 0.4,
    },
    headerTitle: {
      marginTop: 10,
      fontSize: 16,
      fontWeight: '700',
      color: t.textPrimary,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
  });
