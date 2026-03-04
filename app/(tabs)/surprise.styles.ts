import { Dimensions, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 16) / 2;
const VIDEO_WIDTH = SCREEN_WIDTH - 32;
const VIDEO_HEIGHT = Math.round((VIDEO_WIDTH * 9) / 16);

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },
  safeAreaCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.black,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.black95,
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
    color: colors.white,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.white60,
    marginTop: 1,
  },

  // ── Pills ────────────────────────────────────────────────────────────────────
  pillScroll: {
    flexGrow: 0,
    backgroundColor: colors.black95,
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
    backgroundColor: colors.white5,
    borderColor: colors.white20,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white60,
  },
  pillTextActive: {
    color: colors.white,
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
    color: colors.white60,
    fontSize: 15,
  },

  // ── Featured video ────────────────────────────────────────────────────────────
  featuredContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.white5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredVideoBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.white5,
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
    // Slight shadow for contrast on thumbnails
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
  featuredDuration: {
    fontSize: 12,
    color: colors.white60,
  },
  featuredViews: {
    fontSize: 12,
    color: colors.white60,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 22,
  },
  featuredDesc: {
    fontSize: 13,
    color: colors.white60,
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
    backgroundColor: colors.white5,
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
  cardDurationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: colors.black80,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardDurationText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  cardBody: {
    padding: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 18,
  },
  cardViews: {
    fontSize: 11,
    color: colors.white40,
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
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
});
