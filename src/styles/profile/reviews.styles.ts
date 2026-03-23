import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
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

    // Sort
    sortRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    sortButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: t.input,
    },
    sortButtonActive: {
      backgroundColor: colors.red600,
    },
    sortButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textSecondary,
    },
    sortButtonTextActive: {
      color: t.textPrimary,
    },

    // Review List
    reviewList: {
      gap: 12,
    },
    reviewCard: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
      gap: 12,
    },
    reviewTop: {
      flexDirection: 'row',
      gap: 12,
    },
    poster: {
      width: 64,
      height: 96,
      borderRadius: 8,
      flexShrink: 0,
    },
    reviewInfo: {
      flex: 1,
      gap: 6,
    },
    movieTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: t.textPrimary,
    },
    starRow: {
      flexDirection: 'row',
      gap: 2,
    },
    reviewTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textSecondary,
      fontStyle: 'italic',
    },
    reviewBody: {
      fontSize: 14,
      color: t.textSecondary,
      lineHeight: 20,
    },

    // Footer
    reviewFooter: {
      borderTopWidth: 1,
      borderTopColor: t.border,
      paddingTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    reviewMeta: {
      gap: 4,
    },
    reviewDate: {
      fontSize: 12,
      color: t.textTertiary,
    },
    helpfulBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    helpfulText: {
      fontSize: 12,
      color: t.textTertiary,
    },
    reviewActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: t.input,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.textSecondary,
    },
    deleteButton: {
      backgroundColor: colors.red600_20,
    },
    deleteText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.red500,
    },
  });
