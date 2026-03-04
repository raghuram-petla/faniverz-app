import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Profile Card
  profileCard: {
    backgroundColor: colors.zinc900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white10,
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
    borderColor: colors.zinc900,
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
    backgroundColor: colors.white10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 11,
    color: colors.white60,
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
    borderTopColor: colors.white10,
    paddingTop: 12,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  emailText: {
    fontSize: 13,
    color: colors.white60,
    marginTop: 2,
  },
  memberSince: {
    fontSize: 12,
    color: colors.white40,
    marginTop: 4,
  },

  // Menu Card
  menuCard: {
    backgroundColor: colors.zinc900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white10,
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
    borderBottomColor: colors.white5,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.white,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    color: colors.white,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 15,
    color: colors.white50,
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
    color: colors.white40,
  },
  footerTagline: {
    fontSize: 12,
    color: colors.white30,
  },
});
