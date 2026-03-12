import { StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 4;
const NUM_COLUMNS = 3;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

    // Hero header
    heroContainer: { height: 200, width: SCREEN_WIDTH, overflow: 'hidden' },
    heroInfo: {
      position: 'absolute',
      bottom: 0,
      left: 16,
      right: 16,
      paddingBottom: 16,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.white,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    heroSubtitle: {
      fontSize: 14,
      color: colors.white60,
      marginTop: 4,
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
    stickyTitleWrap: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
    stickyTitle: { fontSize: 18, fontWeight: '700', color: t.textPrimary },
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
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
    photoCard: { width: CARD_WIDTH },
    photoImage: {
      width: '100%',
      aspectRatio: 2 / 3,
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
