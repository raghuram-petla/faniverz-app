import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/theme';
import { colors } from '@/theme/colors';
import { useFilmStripStore } from '@/stores/useFilmStripStore';
import {
  RAIL_WIDTH,
  SPROCKET_SIZE,
  SPROCKET_RADIUS,
  SPROCKET_SPACING,
  FRAME_RADIUS,
  getFilmColor,
} from '@/constants/filmStrip';

export interface FilmStripFrameProps {
  children: React.ReactNode;
}

/**
 * @coupling FeedCard — wraps each card to render left/right film rails with sprocket holes.
 * When cards stack in FlashList the rails appear as one continuous film strip.
 */
function FilmStripFrameInner({ children }: FilmStripFrameProps) {
  const { theme } = useTheme();
  const enabled = useFilmStripStore((s) => s.filmStripEnabled);
  const filmColor = getFilmColor(theme);
  const [height, setHeight] = useState(0);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setHeight(e.nativeEvent.layout.height);
  }, []);

  /** @sync sprocket positions recomputed only when measured height changes */
  const sprocketTops = useMemo(() => {
    if (height === 0) return [];
    const count = Math.floor(height / SPROCKET_SPACING);
    const offset = (height - (count - 1) * SPROCKET_SPACING) / 2;
    return Array.from(
      { length: count },
      (_, i) => offset + i * SPROCKET_SPACING - SPROCKET_SIZE / 2,
    );
  }, [height]);

  // @contract when disabled, render children in a simple rounded card
  // @edge dark: pure black cards; light: pure white cards — divider line provides separation
  const isDark = theme.statusBarStyle === 'light';
  const cardBg = isDark ? colors.neutral900 : colors.neutral100;
  if (!enabled) {
    return <View style={[styles.card, { backgroundColor: cardBg }]}>{children}</View>;
  }

  return (
    <View style={[styles.outer, { backgroundColor: filmColor }]} onLayout={handleLayout}>
      {/* Left sprocket holes — positioned absolutely over the film background */}
      {sprocketTops.map((top, i) => (
        <View
          key={`l${i}`}
          style={[styles.sprocket, styles.sprocketLeft, { top, backgroundColor: theme.background }]}
        />
      ))}

      {/* Frame content area — rounded cutout revealing content over film material */}
      <View style={[styles.frame, { backgroundColor: theme.background }]}>{children}</View>

      {/* Right sprocket holes — positioned absolutely over the film background */}
      {sprocketTops.map((top, i) => (
        <View
          key={`r${i}`}
          style={[
            styles.sprocket,
            styles.sprocketRight,
            { top, backgroundColor: theme.background },
          ]}
        />
      ))}
    </View>
  );
}

/** @sync React.memo prevents re-render when parent re-renders with same children */
export const FilmStripFrame = React.memo(FilmStripFrameInner);

const styles = StyleSheet.create({
  /** @contract film-colored background — rounded frame content sits on top, revealing
   *  dark film material at the corners and behind the sprocket rails */
  outer: {
    paddingHorizontal: RAIL_WIDTH,
  },
  sprocket: {
    position: 'absolute',
    width: SPROCKET_SIZE,
    height: SPROCKET_SIZE,
    borderRadius: SPROCKET_RADIUS,
    zIndex: 1,
  },
  sprocketLeft: {
    left: (RAIL_WIDTH - SPROCKET_SIZE) / 2,
  },
  sprocketRight: {
    right: (RAIL_WIDTH - SPROCKET_SIZE) / 2,
  },
  frame: {
    borderRadius: FRAME_RADIUS,
    overflow: 'hidden',
  },
  card: {
    borderRadius: FRAME_RADIUS,
    overflow: 'hidden',
  },
});
