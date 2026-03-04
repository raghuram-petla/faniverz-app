import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

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

  // Header
  stickyHeader: {
    backgroundColor: colors.black95,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.white60,
    marginTop: 2,
  },
  bookmarkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.red600_20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },

  // List
  listContent: {
    paddingTop: 24,
    paddingBottom: 100,
    gap: 12,
    paddingHorizontal: 16,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  // Movie Card
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: colors.white5,
    borderRadius: 12,
  },
  cardWatched: {
    opacity: 0.8,
  },

  // Poster
  posterWrapper: {
    width: 72,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterWatched: {
    opacity: 0.7,
  },
  posterBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  posterBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },

  // Card content
  cardInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  cardTitleWatched: {
    color: colors.white60,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.white60,
  },
  releaseDateText: {
    fontSize: 12,
    color: colors.blue400,
    fontWeight: '600',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  genreText: {
    fontSize: 11,
    color: colors.white40,
  },

  // Action buttons
  actions: {
    justifyContent: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer loader
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
