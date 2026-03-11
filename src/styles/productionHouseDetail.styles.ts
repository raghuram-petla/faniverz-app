import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

export const createProductionHouseStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },
    content: {
      paddingBottom: 40,
    },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surfaceElevated,
    },
    logoCenter: {
      alignItems: 'center',
      marginBottom: 16,
    },
    logoImage: {
      width: 100,
      height: 100,
      borderRadius: 16,
    },
    logoFallback: {
      width: 100,
      height: 100,
      borderRadius: 16,
      backgroundColor: t.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      fontSize: 22,
      fontWeight: '700',
      color: t.textPrimary,
      textAlign: 'center',
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      color: t.textSecondary,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    followRow: {
      alignItems: 'center',
      marginBottom: 20,
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
