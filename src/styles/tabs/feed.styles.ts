import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

// ── Feed screen styles ──────────────────────────────────────────────────────────

export const createFeedStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: t.background,
    },
    headerIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.red600,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextBlock: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: t.textPrimary,
      lineHeight: 28,
    },
    headerSubtitle: {
      fontSize: 13,
      color: t.textSecondary,
      marginTop: 1,
    },
    pillScroll: {
      flexGrow: 0,
      backgroundColor: t.background,
    },
    pillScrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
      flexDirection: 'row',
    },
    pill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    pillInactive: {
      backgroundColor: t.surfaceElevated,
      borderColor: t.inputActive,
    },
    pillText: {
      fontSize: 14,
      fontWeight: '500',
      color: t.textSecondary,
    },
    pillTextActive: {
      color: t.textPrimary,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    loadingContainer: {
      paddingTop: 40,
      alignItems: 'center',
    },
    emptyContainer: {
      paddingTop: 60,
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: t.textPrimary,
    },
    emptySubtitle: {
      fontSize: 14,
      color: t.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    feedList: {
      paddingHorizontal: 0,
    },
  });

// ── Feed card styles (X/Twitter-style two-column layout) ─────────────────────────

export const createFeedCardStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    // Two-column container
    post: {
      flexDirection: 'row',
      paddingLeft: 8,
      paddingRight: 16,
      paddingTop: 12,
    },
    avatarColumn: {
      width: 58, // 48px avatar + 10px gap
      paddingTop: 2,
    },
    contentColumn: {
      flex: 1,
    },
    // Name row: entity name + optional pin/star + dot + timestamp
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    entityName: {
      fontSize: 15,
      fontWeight: '700',
      color: t.textPrimary,
      flexShrink: 1,
    },
    dot: {
      fontSize: 13,
      color: t.textTertiary,
    },
    timestamp: {
      fontSize: 13,
      color: t.textTertiary,
    },
    // Badge row + title (stacked vertically)
    badgeRow: {
      flexDirection: 'row',
      marginTop: 6,
    },
    title: {
      fontSize: 15,
      fontWeight: '400',
      color: t.textPrimary,
      lineHeight: 21,
      marginTop: 4,
    },
    description: {
      fontSize: 14,
      color: t.textSecondary,
      lineHeight: 20,
      marginTop: 4,
    },
    // Media containers
    mediaContainer: {
      marginTop: 10,
      borderRadius: 12,
      overflow: 'hidden',
      aspectRatio: 16 / 9,
      backgroundColor: t.surfaceElevated,
    },
    posterMediaContainer: {
      marginTop: 10,
      borderRadius: 12,
      overflow: 'hidden',
      aspectRatio: 40 / 51,
      backgroundColor: t.surfaceElevated,
    },
    media: {
      ...StyleSheet.absoluteFillObject,
    },
    playBtn: {
      position: 'absolute',
      alignSelf: 'center',
      top: '40%',
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(220, 38, 38, 0.85)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    playIcon: {
      marginLeft: 2,
    },
    durationBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: t.overlayHeavy,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    durationText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    actionBar: {
      paddingTop: 10,
      paddingBottom: 4,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.border,
      marginTop: 10,
      marginLeft: -58, // extend separator full width across both columns
    },
  });
