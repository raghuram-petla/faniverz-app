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
      paddingBottom: 40,
    },

    // Profile Card
    profileCard: {
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 24,
      marginBottom: 16,
    },
    profileTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
      marginBottom: 16,
    },

    // Avatar
    avatarWrapper: {
      position: 'relative',
      flexShrink: 0,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 3,
      borderColor: t.surface,
    },
    cameraButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.red600,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Stats
    statsRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingTop: 4,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: t.border,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: t.textPrimary,
      lineHeight: 24,
    },
    statLabel: {
      fontSize: 11,
      color: t.textSecondary,
      marginTop: 2,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },

    // User info
    userInfo: {
      borderTopWidth: 1,
      borderTopColor: t.border,
      paddingTop: 12,
    },
    displayName: {
      fontSize: 20,
      fontWeight: '700',
      color: t.textPrimary,
    },
    emailText: {
      fontSize: 13,
      color: t.textSecondary,
      marginTop: 2,
    },
    memberSince: {
      fontSize: 12,
      color: t.textTertiary,
      marginTop: 4,
    },

    // Menu Card
    menuCard: {
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
      marginBottom: 16,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    menuItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: t.borderSubtle,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    menuItemLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: t.textPrimary,
    },
    menuItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    // Theme label
    themeLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: t.textTertiary,
    },

    // Badge
    badge: {
      backgroundColor: colors.red600,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },

    // Guest view
    guestContainer: {
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    guestContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingHorizontal: 32,
    },
    guestTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: t.textPrimary,
      textAlign: 'center',
    },
    guestSubtitle: {
      fontSize: 15,
      color: t.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },

    // Login button
    loginButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 32,
      backgroundColor: colors.red600,
      marginTop: 8,
    },
    loginText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.white,
    },

    // Footer
    footer: {
      alignItems: 'center',
      marginTop: 16,
      gap: 4,
    },
    footerVersion: {
      fontSize: 13,
      color: t.textTertiary,
    },
    footerTagline: {
      fontSize: 12,
      color: t.textDisabled,
    },
  });
