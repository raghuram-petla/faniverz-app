import { Dimensions, StyleSheet } from 'react-native';
import type { SemanticTheme } from '@shared/themes';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const HERO_HEIGHT = 600;
export const CARD_WIDTH = 128;
export const CARD_POSTER_HEIGHT = 192; // 128 * 3/2
export const CARD_GAP = 12;
export const SECTION_GAP = 32;
export const HORIZONTAL_PADDING = 16;

export const createStyles = (_t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      gap: 0,
    },
    heroSkeleton: {
      width: SCREEN_WIDTH,
      height: HERO_HEIGHT,
    },
    sections: {
      paddingTop: 16,
      gap: SECTION_GAP,
    },
    section: {
      gap: 12,
    },
    sectionHeader: {
      paddingHorizontal: HORIZONTAL_PADDING,
    },
    cardRow: {
      flexDirection: 'row',
      paddingHorizontal: HORIZONTAL_PADDING,
      gap: CARD_GAP,
    },
    card: {
      gap: 8,
    },
    subsectionTitle: {
      paddingHorizontal: HORIZONTAL_PADDING,
      marginTop: 16,
      marginBottom: 4,
    },
  });
