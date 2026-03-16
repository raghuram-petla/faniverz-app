import { StyleSheet } from 'react-native';
import type { SemanticTheme } from '@shared/themes';

export const createCustomPlayerStyles = (theme: SemanticTheme) =>
  StyleSheet.create({
    container: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: '#000',
      position: 'relative',
    },
    webview: {
      flex: 1,
      backgroundColor: '#000',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.overlayHeavy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerIcon: {
      marginLeft: 3,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 10,
      paddingTop: 6,
      gap: 8,
      backgroundColor: theme.overlay,
    },
    bottomBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    seekTrack: {
      flex: 1,
      height: 24,
      justifyContent: 'center',
    },
    seekTrackBg: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 3,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    seekTrackFill: {
      position: 'absolute',
      left: 0,
      height: 3,
      borderRadius: 2,
      backgroundColor: '#fff',
    },
    seekThumb: {
      position: 'absolute',
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#fff',
      marginTop: -4.5,
      top: '50%',
    },
  });
