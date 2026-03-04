import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  centered: {
    paddingVertical: 64,
    alignItems: 'center',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.white10,
    gap: 4,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: colors.white50,
    textAlign: 'center',
  },

  // Sort
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white10,
  },
  sortButtonActive: {
    backgroundColor: colors.red600,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white50,
  },
  sortButtonTextActive: {
    color: colors.white,
  },

  // Review List
  reviewList: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: colors.white5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white10,
    padding: 16,
    gap: 12,
  },
  reviewTop: {
    flexDirection: 'row',
    gap: 12,
  },
  poster: {
    width: 64,
    height: 96,
    borderRadius: 8,
    flexShrink: 0,
  },
  reviewInfo: {
    flex: 1,
    gap: 6,
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white60,
    fontStyle: 'italic',
  },
  reviewBody: {
    fontSize: 14,
    color: colors.white60,
    lineHeight: 20,
  },

  // Footer
  reviewFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.white10,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewMeta: {
    gap: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.white40,
  },
  helpfulBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpfulText: {
    fontSize: 12,
    color: colors.white40,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.white10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white60,
  },
  deleteButton: {
    backgroundColor: colors.red600_20,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.red500,
  },
});
