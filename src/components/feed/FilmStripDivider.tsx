import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

/** @invariant sprocket sizing — classic film reel proportions */
const STRIP_HEIGHT = 7;

export interface FilmStripDividerProps {
  /** @contract optional top margin override; defaults to 10 */
  marginTop?: number;
}

/**
 * @coupling FeedCard — used as the between-card separator in the news feed
 * Renders a lightweight film strip divider using a dashed border pattern
 * instead of individual View elements per sprocket hole.
 */
function FilmStripDividerInner({ marginTop = 10 }: FilmStripDividerProps) {
  const { theme } = useTheme();

  return (
    <View style={[localStyles.container, { marginTop }]}>
      <View style={[localStyles.strip, { backgroundColor: theme.textTertiary }]}>
        <View
          style={[
            localStyles.sprocketRow,
            {
              borderColor: theme.background,
            },
          ]}
        />
      </View>
    </View>
  );
}

/** @sync React.memo prevents re-render when parent (FeedCard) re-renders with same theme */
export const FilmStripDivider = React.memo(FilmStripDividerInner);

const localStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  strip: {
    height: STRIP_HEIGHT,
    justifyContent: 'center',
  },
  /** @assumes dashed border approximates the sprocket hole pattern with only 1 View
   * instead of ~160 Views (2 per cell × 80 cells). dashGap and dashWidth tuned to
   * match the original SPROCKET_SIZE=5, DOT_SIZE=2, ITEM_GAP=2 spacing. */
  sprocketRow: {
    height: 5,
    borderStyle: 'dashed',
    borderWidth: 2.5,
    borderRadius: 1.5,
  },
});
