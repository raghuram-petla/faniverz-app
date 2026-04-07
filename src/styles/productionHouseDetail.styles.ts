import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

export const createProductionHouseStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    rightContentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      color: t.textSecondary,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: t.textPrimary,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    moviesList: {
      paddingHorizontal: 16,
      gap: 12,
    },
    movieCard: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: t.surfaceElevated,
      borderRadius: 12,
      overflow: 'hidden',
    },
    moviePoster: {
      width: 70,
      height: 100,
      backgroundColor: t.surface,
    },
    movieInfo: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: 10,
      paddingRight: 12,
    },
    movieTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: t.textPrimary,
      marginBottom: 4,
    },
    movieYear: {
      fontSize: 13,
      color: t.textTertiary,
      marginBottom: 4,
    },
    movieRatingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    movieRatingValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.yellow400,
    },
  });
