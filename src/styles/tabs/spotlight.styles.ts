import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: t.background,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    searchButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.red600,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: t.textPrimary,
      lineHeight: 28,
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
