import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useFilmStripStore } from '@/stores/useFilmStripStore';
import { RAIL_WIDTH, SPROCKET_SIZE, SPROCKET_RADIUS, getFilmColor } from '@/constants/filmStrip';

/** @invariant divider height = sprocket + vertical padding so the hole sits centered */
const DIVIDER_HEIGHT = SPROCKET_SIZE + 2;
/** @invariant edge divider is half-height — clips the sprocket to look like a film cut */
const EDGE_HEIGHT = Math.ceil(SPROCKET_SIZE / 2) + 2;

export interface FilmStripFrameDividerProps {
  /** @contract when true, renders a half-cut sprocket at the edge (film snip effect) */
  isEdge?: boolean;
}

/**
 * @coupling FilmStripFrame — horizontal bar of film material between frames.
 * Includes a sprocket hole on each side so the holes run continuously through dividers.
 */
function FilmStripFrameDividerInner({ isEdge }: FilmStripFrameDividerProps) {
  const { theme } = useTheme();
  const enabled = useFilmStripStore((s) => s.filmStripEnabled);

  // @contract when disabled, render a small spacer between cards
  if (!enabled) return <View style={styles.spacer} />;
  const filmColor = getFilmColor(theme);
  const height = isEdge ? EDGE_HEIGHT : DIVIDER_HEIGHT;

  return (
    <View style={[styles.bar, { height, backgroundColor: filmColor }]}>
      {/* Left sprocket hole — clipped at top when isEdge */}
      <View
        style={[
          styles.sprocket,
          styles.sprocketLeft,
          { backgroundColor: theme.background },
          isEdge && styles.sprocketEdge,
        ]}
      />
      {/* Right sprocket hole — clipped at top when isEdge */}
      <View
        style={[
          styles.sprocket,
          styles.sprocketRight,
          { backgroundColor: theme.background },
          isEdge && styles.sprocketEdge,
        ]}
      />
    </View>
  );
}

/** @sync React.memo prevents re-render when parent re-renders with same theme */
export const FilmStripFrameDivider = React.memo(FilmStripFrameDividerInner);

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sprocket: {
    position: 'absolute',
    width: SPROCKET_SIZE,
    height: SPROCKET_SIZE,
    borderRadius: SPROCKET_RADIUS,
  },
  /** @contract shifts sprocket down so only the bottom half is visible — film snip effect */
  sprocketEdge: {
    top: -Math.floor(SPROCKET_SIZE / 2) + 1,
  },
  sprocketLeft: {
    left: (RAIL_WIDTH - SPROCKET_SIZE) / 2,
  },
  sprocketRight: {
    right: (RAIL_WIDTH - SPROCKET_SIZE) / 2,
  },
  spacer: {
    height: 10,
  },
});
