import { StyleSheet, Dimensions } from 'react-native';
import type { SemanticTheme } from '@shared/themes';
import { DETAIL_HERO_HEIGHT, DETAIL_HERO_INFO_OFFSET } from '@shared/constants';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const HERO_HEIGHT = DETAIL_HERO_HEIGHT + DETAIL_HERO_INFO_OFFSET;
export const POSTER_WIDTH = 112;
export const POSTER_HEIGHT = 168; // 112 * 3/2

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    hero: {
      width: SCREEN_WIDTH,
      height: HERO_HEIGHT,
      overflow: 'hidden',
    },
    heroInfo: {
      position: 'absolute',
      bottom: 0,
      left: 16,
      right: 16,
      paddingBottom: 16,
      flexDirection: 'row',
      gap: 16,
    },
    heroTextArea: {
      flex: 1,
      justifyContent: 'flex-end',
      gap: 8,
    },
    body: {
      paddingHorizontal: 16,
      paddingTop: 24,
      gap: 20,
    },
    tabBar: {
      flexDirection: 'row',
      gap: 8,
    },
    contentLines: {
      gap: 12,
    },
  });
