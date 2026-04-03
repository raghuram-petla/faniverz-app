import { StyleSheet } from 'react-native';

const INDICATOR_BOTTOM_GAP = 20;

export const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  pill: {
    minWidth: 164,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  overlayContainer: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center' as const,
    paddingBottom: INDICATOR_BOTTOM_GAP,
  },
});
