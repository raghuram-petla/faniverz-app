import { StyleSheet } from 'react-native';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingBottom: 48,
    },

    // Sections
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: t.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    sectionCard: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: t.surfaceElevated,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: t.textPrimary,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rowValue: {
      fontSize: 14,
      color: t.textTertiary,
    },

    // Radio row (theme selector)
    radioRow: {
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    radioHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    radioOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    radioChip: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioChipSelected: {
      backgroundColor: palette.red600,
    },
    radioChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textSecondary,
    },
    radioChipTextSelected: {
      color: palette.white,
    },

    // Toggle
    toggle: {
      width: 48,
      height: 28,
      borderRadius: 14,
      padding: 3,
      justifyContent: 'center',
    },
    toggleOn: {
      backgroundColor: palette.red600,
    },
    toggleOff: {
      backgroundColor: t.textDisabled,
    },
    toggleThumb: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: palette.white,
    },
    toggleThumbOn: {
      alignSelf: 'flex-end',
    },
    toggleThumbOff: {
      alignSelf: 'flex-start',
    },

    // Footer
    footer: {
      alignItems: 'center',
      marginTop: 8,
      gap: 4,
    },
    footerVersion: {
      fontSize: 13,
      color: t.textTertiary,
      fontWeight: '600',
    },
    footerBuild: {
      fontSize: 12,
      color: t.textDisabled,
    },
  });
