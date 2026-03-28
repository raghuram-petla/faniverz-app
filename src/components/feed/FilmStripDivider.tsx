import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
/** @invariant sprocket sizing — classic film reel proportions */
const STRIP_HEIGHT = 10;
const SPROCKET_SIZE = 8;
const SPROCKET_RADIUS = 2;
const DOT_SIZE = 3;
const ITEM_GAP = 2;
/** @assumes each cell = one sprocket + gap + one dot + gap */
const CELL_WIDTH = SPROCKET_SIZE + ITEM_GAP + DOT_SIZE + ITEM_GAP;
const CELL_COUNT = Math.ceil(SCREEN_WIDTH / CELL_WIDTH) + 1;

export interface FilmStripDividerProps {
  /** @contract optional top margin override; defaults to 10 */
  marginTop?: number;
}

/**
 * @coupling FeedCard — used as the between-card separator in the news feed
 * Renders a horizontal film strip: alternating sprocket holes and dots
 * (hole · dot · hole · dot) for a classic movie reel look.
 */
export function FilmStripDivider({ marginTop = 10 }: FilmStripDividerProps) {
  const { theme } = useTheme();
  const stripColor = theme.textTertiary;
  const holeColor = theme.background;
  const dotColor = theme.textSecondary;

  /** @assumes builds alternating [hole, dot, hole, dot, ...] row */
  const cells = useMemo(() => {
    const items: React.ReactElement[] = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      items.push(
        <View key={`s${i}`} style={[localStyles.sprocket, { backgroundColor: holeColor }]} />,
      );
      items.push(<View key={`d${i}`} style={[localStyles.dot, { backgroundColor: dotColor }]} />);
    }
    return items;
  }, [holeColor, dotColor]);

  return (
    <View style={[localStyles.container, { marginTop }]}>
      <View style={[localStyles.strip, { backgroundColor: stripColor }]}>
        <View style={localStyles.row}>{cells}</View>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  strip: {
    height: STRIP_HEIGHT,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sprocket: {
    width: SPROCKET_SIZE,
    height: SPROCKET_SIZE,
    borderRadius: SPROCKET_RADIUS,
    marginHorizontal: ITEM_GAP / 2,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: ITEM_GAP / 2,
  },
});
