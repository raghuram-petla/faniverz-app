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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
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
  });

// ── Feed card styles (YouTube-style stacked layout, edge-to-edge media) ──────────

export const createFeedCardStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    // @contract Stacked container — no horizontal padding so media can be edge-to-edge
    post: {
      paddingTop: 12,
    },
    // @contract Inline avatar + stacked meta (name, timestamp, badge)
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingHorizontal: 12,
    },
    // Fills empty space below avatar — tappable to open post
    avatarSpacer: {
      flex: 1,
    },
    // Stacked column: name, badge+timestamp, title
    headerMeta: {
      flex: 1,
      gap: 6,
    },
    // Name row: entity name only (follow button positioned absolutely)
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingRight: 100,
    },
    followWrap: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
    entityName: {
      fontSize: 15,
      fontWeight: '700',
      color: t.textPrimary,
      flexShrink: 1,
    },
    // Badge + timestamp side by side
    badgeTimestampRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    timestamp: {
      fontSize: 13,
      color: t.textTertiary,
    },
    // Title inside headerMeta, next to avatar
    headerTitle: {
      fontSize: 15,
      fontWeight: '400',
      color: t.textPrimary,
      lineHeight: 21,
      marginTop: 2,
    },
    description: {
      fontSize: 14,
      color: t.textSecondary,
      lineHeight: 20,
      marginTop: 4,
      paddingHorizontal: 12,
    },
    // @contract Media containers — full bleed, no horizontal margin/padding
    mediaContainer: {
      width: '100%',
      marginTop: 10,
      overflow: 'hidden',
      aspectRatio: 16 / 9,
      backgroundColor: t.surfaceElevated,
    },
    posterMediaContainer: {
      width: '100%',
      marginTop: 10,
      overflow: 'hidden',
      aspectRatio: 40 / 51,
      backgroundColor: t.surfaceElevated,
    },
    media: {
      ...StyleSheet.absoluteFillObject,
    },
    playIcon: {
      marginLeft: 2,
    },
    actionBar: {
      paddingTop: 10,
      paddingBottom: 4,
      paddingHorizontal: 12,
    },
    fullTimestampRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 10,
    },
    fullTimestampText: {
      fontSize: 15,
      color: t.textTertiary,
    },
    separator: {
      height: 2,
      backgroundColor: t.input,
      marginTop: 10,
      borderRadius: 1,
    },
  });
