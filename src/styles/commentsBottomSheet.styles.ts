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
    dragZone: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 50,
      height: 70,
      justifyContent: 'flex-start',
      paddingTop: 10,
      zIndex: 10,
    },
    dragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.textTertiary,
      opacity: 0.4,
      alignSelf: 'center',
      marginRight: -50,
    },
    scrollContent: {
      marginTop: 24,
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
  });
