import { StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 4;
const NUM_COLUMNS = 3;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

/** @contract Hero height defines the scroll distance over which the collapse animation runs */
export const HERO_HEIGHT = 200;
/** Poster size in the hero (expanded) state */
export const POSTER_EXPANDED_W = 56;
export const POSTER_EXPANDED_H = 84;
/** Poster size in the nav bar (collapsed) state */
export const POSTER_COLLAPSED_W = 28;
export const POSTER_COLLAPSED_H = 42;
/** Nav row total height: paddingVertical(8)*2 + button(40) */
export const NAV_ROW_HEIGHT = 56;
/** Title scale factor: collapsed font / hero font (14/20) */
export const TITLE_SCALE = 14 / 20;

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

    // Hero header (backdrop only — poster + title are floating)
    heroContainer: { height: HERO_HEIGHT, width: SCREEN_WIDTH, overflow: 'hidden' },

    // Floating poster (absolutely positioned, animated via transforms)
    floatingPoster: {
      position: 'absolute',
      width: POSTER_EXPANDED_W,
      height: POSTER_EXPANDED_H,
      zIndex: 11,
    },
    floatingPosterImage: {
      width: POSTER_EXPANDED_W,
      height: POSTER_EXPANDED_H,
      borderRadius: 6,
    },

    // Floating title (absolutely positioned, animated via transforms)
    floatingTitle: {
      position: 'absolute',
      zIndex: 11,
    },
    floatingTitleText: {
      fontSize: 20,
      fontWeight: '700',
    },
    floatingSubtitle: {
      fontSize: 14,
      marginTop: 2,
    },

    // Sticky section
    stickyContainer: { backgroundColor: t.background, paddingBottom: 4 },
    stickyNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    stickyNavLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stickyNavButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stickyNavPlaceholder: { flex: 1 },
    stickyNavRight: { width: 88 },
    filterPillsContainer: { paddingHorizontal: 16, paddingBottom: 4 },

    // Tab bar wrapper
    tabBarWrap: { marginBottom: 12 },

    // Videos tab
    videosTab: { gap: 20 },
    videoSection: { gap: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: t.textPrimary },
    videoList: { gap: 20 },

    // Photos tab
    photosTab: {},
    photoFilterPills: { paddingBottom: 12 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
    photoCard: { width: CARD_WIDTH },
    /** @contract Backdrops span full width so the 16:9 ratio renders at a usable size */
    photoCardBackdrop: { width: '100%' },
    photoImage: {
      width: '100%',
      borderRadius: 8,
      backgroundColor: t.surfaceElevated,
    },
    mainBadge: {
      position: 'absolute',
      top: 6,
      left: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 6,
      zIndex: 2,
    },
    mainBadgeText: { fontSize: 9, fontWeight: '700', color: colors.yellow400 },
    mainBadgeTextBlue: { fontSize: 9, fontWeight: '700', color: colors.blue400 },

    // Photo title overlay
    photoOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40%',
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      padding: 6,
    },
    photoTitle: { fontSize: 10, fontWeight: '600', color: colors.white },

    // Empty state
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 15,
      color: t.textSecondary,
    },
  });
