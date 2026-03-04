import { Dimensions, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const HERO_HEIGHT = 600;

export const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
  },
  slide: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 56,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  metaDot: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  certBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.white30,
    borderRadius: 4,
  },
  certText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  platformLabel: {
    fontSize: 14,
    color: colors.white60,
  },
  platformChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  platformChipText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  watchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    height: 48,
    borderRadius: 24,
    gap: 8,
  },
  watchButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.white30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.white,
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.white30,
  },
});
