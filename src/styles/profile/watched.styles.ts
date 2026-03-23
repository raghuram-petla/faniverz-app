import { StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

export const COLUMN_GAP = 12;
const SCREEN_WIDTH = Dimensions.get('window').width;
export const CARD_WIDTH = (SCREEN_WIDTH - 32 - COLUMN_GAP) / 2;

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
    // Header badge
    countBadge: {
      backgroundColor: t.input,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 24,
      alignItems: 'center',
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: t.textSecondary,
    },

    // Stats
    statsGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      backgroundColor: t.surfaceElevated,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
      gap: 4,
    },
    ratingValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: t.textPrimary,
    },
    statLabel: {
      fontSize: 11,
      color: t.textSecondary,
      textAlign: 'center',
    },

    // Sort Dropdown
    sortWrapper: {
      position: 'relative',
      marginBottom: 20,
      zIndex: 10,
    },
    sortDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      backgroundColor: t.input,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    sortDropdownText: {
      fontSize: 14,
      fontWeight: '600',
      color: t.textPrimary,
      flex: 1,
    },
    sortMenu: {
      position: 'absolute',
      top: 46,
      left: 0,
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
      minWidth: 200,
      zIndex: 20,
    },
    sortMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.borderSubtle,
    },
    sortMenuItemActive: {
      backgroundColor: colors.red600_20,
    },
    sortMenuItemText: {
      fontSize: 14,
      color: t.textSecondary,
    },
    sortMenuItemTextActive: {
      color: t.textPrimary,
      fontWeight: '600',
    },

    // Grid
    grid: {
      gap: COLUMN_GAP,
    },
    gridRow: {
      flexDirection: 'row',
      gap: COLUMN_GAP,
    },
    movieCard: {
      width: CARD_WIDTH,
      gap: 8,
    },
    movieCardEmpty: {
      // invisible spacer
    },
    posterWrapper: {
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      aspectRatio: 2 / 3,
    },
    poster: {
      width: '100%',
      height: '100%',
    },
    checkBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.green500,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratingBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: t.overlayHeavy,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    ratingBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    movieTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textPrimary,
      lineHeight: 18,
    },
  });
