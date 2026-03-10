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
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: t.textPrimary,
    },
    filterButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.red600,
    },
    filterPills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.red600_20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    pillText: {
      color: colors.red400,
      fontSize: 14,
    },
    clearAll: {
      color: colors.red500,
      fontSize: 12,
      textDecorationLine: 'underline',
    },
    filterPanel: {
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.borderSubtle,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    filterLabel: {
      fontSize: 14,
      color: t.textSecondary,
      marginBottom: 8,
    },
    yearButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: t.surfaceElevated,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
    },
    yearButtonActive: {
      backgroundColor: colors.red600,
    },
    yearButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: t.textSecondary,
    },
    yearButtonTextActive: {
      color: colors.white,
    },
    yearDropdown: {
      marginTop: 8,
      backgroundColor: t.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.border,
      maxHeight: 200,
    },
    yearOption: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.borderSubtle,
    },
    yearOptionActive: {
      backgroundColor: colors.red600,
    },
    yearOptionText: {
      color: t.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    yearOptionTextActive: {
      color: colors.white,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    dayScroll: {
      gap: 8,
    },
    dayButton: {
      width: 44,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: t.surfaceElevated,
      alignItems: 'center',
    },
    monthButton: {
      width: '30%',
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: t.surfaceElevated,
      alignItems: 'center',
    },
    monthButtonActive: {
      backgroundColor: colors.red600,
    },
    monthButtonText: {
      color: t.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    monthButtonTextActive: {
      color: colors.white,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingVertical: 24,
      paddingBottom: 120,
    },
    dateGroup: {
      marginBottom: 24,
      gap: 12,
    },
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
    },
    dateBox: {
      width: 64,
      height: 64,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    dateBoxToday: {
      backgroundColor: colors.red600,
    },
    dateBoxUpcoming: {
      backgroundColor: colors.purple600_20,
      borderWidth: 1,
      borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    dateBoxPast: {
      backgroundColor: t.surfaceElevated,
    },
    dateBoxMonth: {
      fontSize: 12,
      fontWeight: '700',
      color: t.textPrimary,
    },
    dateBoxDay: {
      fontSize: 24,
      fontWeight: '700',
      color: t.textPrimary,
    },
    dateInfo: {
      flex: 1,
    },
    dateWeekday: {
      fontSize: 18,
      fontWeight: '700',
      color: t.textPrimary,
    },
    dateFull: {
      fontSize: 14,
      color: t.textSecondary,
    },
    todayBadge: {
      marginTop: 4,
      backgroundColor: colors.red600,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      alignSelf: 'flex-start',
    },
    todayBadgeText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: '700',
    },
    releaseCount: {
      fontSize: 14,
      fontWeight: '600',
      color: t.textSecondary,
      flexShrink: 0,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 48,
    },
    emptyText: {
      color: t.textSecondary,
      fontSize: 16,
    },
    clearFiltersLink: {
      color: colors.red500,
      marginTop: 16,
      textDecorationLine: 'underline',
    },
    footerLoader: {
      paddingVertical: 24,
      alignItems: 'center',
    },
  });
