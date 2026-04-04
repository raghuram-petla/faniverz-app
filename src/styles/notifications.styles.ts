import { StyleSheet } from 'react-native';
import type { SemanticTheme } from '@shared/themes';
import { colors as palette } from '@/theme/colors';

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },

    // Header
    headerWrapper: {
      paddingBottom: 16,
      paddingHorizontal: 16,
    },
    unreadBadge: {
      backgroundColor: palette.red600,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.white,
    },
    markAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.red500,
    },
    markAllTextDisabled: {
      color: t.textTertiary,
    },

    // List
    listContent: {
      paddingBottom: 40,
    },
    listEmptyContent: {
      flex: 1,
    },

    // Notification item
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    itemUnread: {
      backgroundColor: t.surfaceElevated,
    },
    posterContainer: {
      position: 'relative',
    },
    poster: {
      width: 64,
      height: 96,
      borderRadius: 12,
      backgroundColor: t.input,
    },
    typeIconBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: t.background,
    },
    itemContent: {
      flex: 1,
      gap: 4,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: t.textPrimary,
    },
    itemMessage: {
      fontSize: 13,
      color: t.textSecondary,
      lineHeight: 18,
    },
    itemTimestamp: {
      fontSize: 12,
      color: t.textTertiary,
      marginTop: 2,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.red500,
      alignSelf: 'center',
      flexShrink: 0,
    },

    // Separator
    separator: {
      height: 1,
      backgroundColor: t.border,
      marginHorizontal: 16,
    },
  });
