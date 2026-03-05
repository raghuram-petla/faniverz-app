import { Dimensions, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 16) / 2;
const FEATURED_WIDTH = SCREEN_WIDTH - 64;

// ── Feed screen styles ──────────────────────────────────────────────────────────

export const createFeedStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },
    safeAreaCover: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
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
      gap: 20,
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
    featuredSection: {
      paddingLeft: 16,
    },
    featuredSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: t.textPrimary,
      marginBottom: 12,
    },
    featuredListContent: {
      gap: 12,
      paddingRight: 16,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 16,
    },
  });

// ── Feed card styles ────────────────────────────────────────────────────────────

export const createFeedCardStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: t.surfaceElevated,
    },
    thumbnail: {
      width: '100%',
      aspectRatio: 16 / 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnailImage: {
      ...StyleSheet.absoluteFillObject,
    },
    playBtn: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(220, 38, 38, 0.80)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    playIcon: {
      marginLeft: 2,
    },
    badgeContainer: {
      position: 'absolute',
      top: 6,
      left: 6,
    },
    durationBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: t.overlayHeavy,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    durationText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    pinBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.red600,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: 10,
      gap: 4,
    },
    title: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textPrimary,
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    movieTitle: {
      fontSize: 11,
      color: t.textSecondary,
      flex: 1,
      marginRight: 8,
    },
    timestamp: {
      fontSize: 10,
      color: t.textTertiary,
    },
  });

// ── Featured card styles ────────────────────────────────────────────────────────

export const createFeaturedCardStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    card: {
      width: FEATURED_WIDTH,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: t.surfaceElevated,
    },
    thumbnail: {
      width: '100%',
      aspectRatio: 16 / 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surfaceElevated,
    },
    thumbnailImage: {
      ...StyleSheet.absoluteFillObject,
    },
    thumbnailPlaceholder: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.zinc900,
    },
    playBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.red600,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 6,
    },
    playIcon: {
      marginLeft: 3,
    },
    featuredBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.red600,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    featuredText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    meta: {
      padding: 14,
      gap: 6,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    duration: {
      fontSize: 12,
      color: t.textSecondary,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: t.textPrimary,
      lineHeight: 22,
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    movieTitle: {
      fontSize: 12,
      color: t.textSecondary,
      flex: 1,
      marginRight: 8,
    },
    timestamp: {
      fontSize: 11,
      color: t.textTertiary,
    },
  });
