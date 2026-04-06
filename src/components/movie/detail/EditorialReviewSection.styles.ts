import { StyleSheet } from 'react-native';
import type { SemanticTheme } from '@shared/themes';
import { colors } from '@/theme/colors';

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 4,
      marginTop: 16,
      backgroundColor: t.surfaceElevated,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: t.borderSubtle,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    badge: {
      backgroundColor: colors.red600,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    authorName: {
      fontSize: 13,
      color: t.textSecondary,
      fontWeight: '500',
    },
    overallRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.borderSubtle,
    },
    overallLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: t.textPrimary,
    },
    overallRating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    overallValue: {
      fontSize: 22,
      fontWeight: '800',
      color: t.textPrimary,
    },
    overallMax: {
      fontSize: 13,
      color: t.textTertiary,
    },
    craftSection: {
      marginBottom: 16,
    },
    craftHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    craftHeaderLabel: {
      fontSize: 11,
      color: t.textTertiary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.borderSubtle,
      marginVertical: 12,
    },
    verdict: {
      fontSize: 15,
      fontWeight: '600',
      fontStyle: 'italic',
      color: t.textPrimary,
      marginBottom: 8,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: t.textSecondary,
    },
    readMore: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.red600,
      marginTop: 4,
    },
    ratePrompt: {
      fontSize: 12,
      color: t.textTertiary,
      textAlign: 'center',
      marginTop: 4,
    },
    userRatingCount: {
      fontSize: 13,
      color: t.textTertiary,
      marginTop: 4,
    },
  });
