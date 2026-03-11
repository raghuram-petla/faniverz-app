import { Dimensions, StyleSheet } from 'react-native';
import type { SemanticTheme } from '@shared/themes';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const HERO_HEIGHT = 600;

export const createStyles = (_t: SemanticTheme) =>
  StyleSheet.create({
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
      color: '#FFFFFF',
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
      color: '#FFFFFF',
      marginBottom: 4,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
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
      borderColor: 'rgba(255,255,255,0.3)',
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
      color: 'rgba(255,255,255,0.6)',
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
      backgroundColor: 'rgba(240,240,240,0.7)',
      height: 48,
      borderRadius: 24,
      gap: 8,
    },
    watchButtonText: {
      color: '#000000',
      fontSize: 16,
      fontWeight: '600',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
      paddingHorizontal: 16,
      borderRadius: 24,
      backgroundColor: 'rgba(240,240,240,0.7)',
      gap: 6,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    infoButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(240,240,240,0.7)',
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
      backgroundColor: '#FFFFFF',
    },
    dotInactive: {
      width: 6,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
  });
