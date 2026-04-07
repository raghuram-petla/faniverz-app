import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.black,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 12,
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerWrapper: {
    flex: 1,
  },
  shareOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shareHitArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 56,
    height: 44,
  },
});
