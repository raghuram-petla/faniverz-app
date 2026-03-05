import { StyleSheet } from 'react-native';
import type { SemanticTheme } from '@shared/themes';

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },
    safeAreaCover: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: t.background,
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      paddingHorizontal: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 4,
      backgroundColor: t.background,
    },
    logoFull: {
      height: 52,
      width: 146,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      flex: 1,
    },
    sections: {
      paddingBottom: 100,
      gap: 32,
      paddingTop: 16,
    },
    horizontalList: {
      paddingHorizontal: 16,
    },
    subsection: {
      marginTop: 16,
    },
    subsectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: t.textPrimary,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    platformGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 12,
    },
  });
