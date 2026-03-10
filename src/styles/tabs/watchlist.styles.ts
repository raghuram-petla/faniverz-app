import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },
    // Header
    stickyHeader: {
      backgroundColor: t.background,
      paddingHorizontal: 16,
      paddingBottom: 16,
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
    headerSubtitle: {
      fontSize: 13,
      color: t.textSecondary,
      marginTop: 2,
    },
    bookmarkCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.red600_20,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Empty state
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingBottom: 80,
    },

    // List
    listContent: {
      paddingTop: 24,
      paddingBottom: 100,
      gap: 12,
      paddingHorizontal: 16,
    },

    // Section
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 20,
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: t.textPrimary,
    },

    // Movie Card
    card: {
      flexDirection: 'row',
      gap: 12,
      padding: 12,
      backgroundColor: t.surfaceElevated,
      borderRadius: 12,
    },
    cardWatched: {
      opacity: 0.8,
    },

    // Poster
    posterWrapper: {
      width: 72,
      aspectRatio: 2 / 3,
      borderRadius: 8,
      overflow: 'hidden',
      flexShrink: 0,
    },
    poster: {
      width: '100%',
      height: '100%',
    },
    posterWatched: {
      opacity: 0.7,
    },
    posterBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    posterBadgeText: {
      color: colors.white,
      fontSize: 9,
      fontWeight: '700',
    },

    // Card content
    cardInfo: {
      flex: 1,
      minWidth: 0,
      gap: 4,
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: t.textPrimary,
    },
    cardTitleWatched: {
      color: t.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ratingText: {
      fontSize: 12,
      color: t.textSecondary,
    },
    releaseDateText: {
      fontSize: 12,
      color: colors.blue400,
      fontWeight: '600',
    },
    genreRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    genreText: {
      fontSize: 11,
      color: t.textTertiary,
    },

    // Action buttons
    actions: {
      justifyContent: 'center',
      gap: 4,
    },
    actionBtn: {
      padding: 8,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Footer loader
    footerLoader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
  });
