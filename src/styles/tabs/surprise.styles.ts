import { Dimensions, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_WIDTH = SCREEN_WIDTH - 32;
const VIDEO_HEIGHT = Math.round((VIDEO_WIDTH * 9) / 16);
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 16) / 2;

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },
    // ── Header ──────────────────────────────────────────────────────────────────
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
      backgroundColor: colors.purple600,
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

    // ── Scroll ───────────────────────────────────────────────────────────────────
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
      gap: 24,
    },
    loadingContainer: {
      paddingTop: 40,
      alignItems: 'center',
    },
    loadingText: {
      color: t.textSecondary,
      fontSize: 15,
    },

    // ── Featured video ────────────────────────────────────────────────────────────
    featuredContainer: {
      marginHorizontal: 16,
      marginTop: 8,
      backgroundColor: t.surfaceElevated,
      borderRadius: 16,
      overflow: 'hidden',
    },
    featuredVideoBox: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: t.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // ── Thumbnail (pre-play) ──
    thumbnailContainer: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnailImage: {
      ...StyleSheet.absoluteFillObject,
    },
    thumbnailPlayBtn: {
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
    videoPlayer: {
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    },
    featuredMeta: {
      padding: 14,
      gap: 6,
    },
    featuredBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    categoryBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    featuredViews: {
      fontSize: 12,
      color: t.textSecondary,
    },
    featuredTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: t.textPrimary,
      lineHeight: 22,
    },
    featuredDesc: {
      fontSize: 13,
      color: t.textSecondary,
      lineHeight: 18,
    },

    // ── Grid ─────────────────────────────────────────────────────────────────────
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 16,
    },
    card: {
      width: CARD_WIDTH,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: t.surfaceElevated,
    },
    cardThumb: {
      width: '100%',
      aspectRatio: 16 / 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardPlayBtn: {
      position: 'absolute',
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(220, 38, 38, 0.80)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardCategoryBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      width: 24,
      height: 24,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      padding: 10,
      gap: 4,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textPrimary,
      lineHeight: 18,
    },
    cardViews: {
      fontSize: 11,
      color: t.textTertiary,
    },

    // ── Fun Fact ──────────────────────────────────────────────────────────────────
    funFact: {
      marginHorizontal: 16,
      backgroundColor: colors.purple600,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    funFactIcon: {
      marginTop: 1,
    },
    funFactTextBlock: {
      flex: 1,
      gap: 4,
    },
    funFactHeading: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.white,
    },
    funFactBody: {
      fontSize: 13,
      color: colors.white,
      lineHeight: 18,
    },
  });
