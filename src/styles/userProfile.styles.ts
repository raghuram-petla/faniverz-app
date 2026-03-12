import { StyleSheet } from 'react-native';
import type { SemanticTheme } from '@shared/themes';

export function createUserProfileStyles(theme: SemanticTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    emptyText: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    scrollContent: {
      padding: 24,
      alignItems: 'center',
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.surfaceElevated,
      marginBottom: 16,
    },
    displayName: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.textPrimary,
      textAlign: 'center',
    },
    username: {
      fontSize: 15,
      color: theme.textSecondary,
      marginTop: 4,
    },
    infoSection: {
      width: '100%',
      marginBottom: 16,
    },
    bio: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
      textAlign: 'center',
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    locationText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
  });
}
