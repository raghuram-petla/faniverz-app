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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.red600,
  },
  filterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.red600_20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    color: colors.red400,
    fontSize: 14,
  },
  clearAll: {
    color: colors.red500,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  filterPanel: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.white5,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: colors.white60,
    marginBottom: 8,
  },
  yearButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  yearButtonActive: {
    backgroundColor: colors.red600,
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white60,
  },
  yearButtonTextActive: {
    color: colors.white,
  },
  yearDropdown: {
    marginTop: 8,
    backgroundColor: '#27272A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.white10,
    maxHeight: 200,
  },
  yearOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.white5,
  },
  yearOptionActive: {
    backgroundColor: colors.red600,
  },
  yearOptionText: {
    color: colors.white60,
    fontSize: 14,
    fontWeight: '500',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayScroll: {
    gap: 8,
  },
  dayButton: {
    width: 44,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.white5,
    alignItems: 'center',
  },
  monthButton: {
    width: '30%',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.white5,
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: colors.red600,
  },
  monthButtonText: {
    color: colors.white60,
    fontSize: 14,
    fontWeight: '500',
  },
  monthButtonTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 120,
  },
  dateGroup: {
    marginBottom: 24,
    gap: 12,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  dateBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dateBoxToday: {
    backgroundColor: colors.red600,
  },
  dateBoxUpcoming: {
    backgroundColor: colors.purple600_20,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  dateBoxPast: {
    backgroundColor: colors.white5,
  },
  dateBoxMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  dateBoxDay: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  dateInfo: {
    flex: 1,
  },
  dateWeekday: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  dateFull: {
    fontSize: 14,
    color: colors.white60,
  },
  todayBadge: {
    marginTop: 4,
    backgroundColor: colors.red600,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  todayBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  releaseCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white50,
    flexShrink: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    color: colors.white60,
    fontSize: 16,
  },
  clearFiltersLink: {
    color: colors.red500,
    marginTop: 16,
    textDecorationLine: 'underline',
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
