import { StyleSheet, Dimensions } from 'react-native';
import type { SemanticTheme } from '@shared/themes';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const DATE_BOX_SIZE = 64;
export const MOVIE_ITEM_HEIGHT = 100;

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 24,
      gap: 24,
    },
    dateGroup: {
      gap: 12,
    },
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dateInfo: {
      flex: 1,
      gap: 6,
    },
    movieItem: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    movieInfo: {
      flex: 1,
      gap: 6,
    },
  });
