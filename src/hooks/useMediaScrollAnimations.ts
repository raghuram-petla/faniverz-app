import {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import {
  HERO_HEIGHT,
  POSTER_EXPANDED_W,
  POSTER_EXPANDED_H,
  POSTER_COLLAPSED_W,
  TITLE_SCALE,
} from '@/styles/movieMedia.styles';

const COLLAPSED_GAP = 8;

export interface MediaScrollAnimationsProps {
  scrollOffset: SharedValue<number>;
  titleWidth: SharedValue<number>;
  titleHeight: SharedValue<number>;
  navLeftWidth: SharedValue<number>;
  screenWidth: number;
  heroPosterCX: number;
  heroPosterCY: number;
  navCenterY: number;
  textPrimaryColor: string;
  textSecondaryColor: string;
}

/**
 * @contract Returns animated styles for floating poster, title, and subtitle
 * that transition between hero (expanded) and nav-bar (collapsed) states.
 * @coupling HERO_HEIGHT, POSTER_* and TITLE_SCALE constants from movieMedia.styles
 */
export function useMediaScrollAnimations({
  scrollOffset,
  titleWidth,
  titleHeight,
  navLeftWidth,
  screenWidth,
  heroPosterCX,
  heroPosterCY,
  navCenterY,
  textPrimaryColor,
  textSecondaryColor,
}: MediaScrollAnimationsProps) {
  /**
   * @contract Computes the left edge of the available area for the collapsed group.
   * Centers the poster+title group between the nav buttons and the right screen edge.
   */
  const getCollapsedGroupLeft = (titleVisualW: number, navW: number) => {
    'worklet';
    const groupW = POSTER_COLLAPSED_W + COLLAPSED_GAP + titleVisualW;
    if (navW === 0) return (screenWidth - groupW) / 2; // fallback: center in screen
    const areaLeft = navW + 16 + 6; // right edge of buttons + row padding + gap
    const areaRight = screenWidth - 16; // right padding
    return Math.max(areaLeft + (areaRight - areaLeft - groupW) / 2, areaLeft);
  };

  // @boundary: p interpolates [0,1] over HERO_HEIGHT; clamped so over-scroll has no effect
  const animatedPosterStyle = useAnimatedStyle(() => {
    const s = scrollOffset.value;
    const p = interpolate(s, [0, HERO_HEIGHT], [0, 1], Extrapolation.CLAMP);

    const titleVisualW = titleWidth.value * TITLE_SCALE;
    const groupLeft = getCollapsedGroupLeft(titleVisualW, navLeftWidth.value);
    const collapsedCX = groupLeft + POSTER_COLLAPSED_W / 2;

    const cy = (heroPosterCY - s) * (1 - p) + navCenterY * p;
    const cx = heroPosterCX * (1 - p) + collapsedCX * p;
    const scale = interpolate(p, [0, 1], [1, POSTER_COLLAPSED_W / POSTER_EXPANDED_W]);

    return {
      transform: [
        { translateX: cx - POSTER_EXPANDED_W / 2 },
        { translateY: cy - POSTER_EXPANDED_H / 2 },
        { scale },
      ],
    };
  });

  const animatedTitleStyle = useAnimatedStyle(() => {
    const s = scrollOffset.value;
    const p = interpolate(s, [0, HERO_HEIGHT], [0, 1], Extrapolation.CLAMP);

    const W = titleWidth.value;
    const H = titleHeight.value;
    const scale = interpolate(p, [0, 1], [1, TITLE_SCALE]);

    const titleVisualW = W * TITLE_SCALE;
    const groupLeft = getCollapsedGroupLeft(titleVisualW, navLeftWidth.value);
    const collapsedNameCX = groupLeft + POSTER_COLLAPSED_W + COLLAPSED_GAP + titleVisualW / 2;

    // Hero: to the right of poster, vertically centered with poster bottom half
    const heroTitleCY = heroPosterCY + POSTER_EXPANDED_H * 0.15;
    const cy = (heroTitleCY - s) * (1 - p) + navCenterY * p;

    const heroTX = heroPosterCX + POSTER_EXPANDED_W / 2 + 12;
    const collapsedTX = collapsedNameCX - W / 2;

    return {
      transform: [
        { translateX: heroTX * (1 - p) + collapsedTX * p },
        { translateY: cy - H / 2 },
        { scale },
      ],
    };
  });

  /** @sideeffect Title color transitions from white (over backdrop) to theme color (in nav bar) */
  const titleColorStyle = useAnimatedStyle(() => {
    const p = interpolate(scrollOffset.value, [0, HERO_HEIGHT], [0, 1], Extrapolation.CLAMP);
    return { color: interpolateColor(p, [0, 1], ['#FFFFFF', textPrimaryColor]) };
  });

  /** @sideeffect Subtitle fades out and transitions color during scroll */
  const subtitleFadeStyle = useAnimatedStyle(() => {
    const s = scrollOffset.value;
    const p = interpolate(s, [0, HERO_HEIGHT], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: interpolate(s, [0, HERO_HEIGHT * 0.4], [1, 0], Extrapolation.CLAMP),
      color: interpolateColor(p, [0, 1], ['#FFFFFF', textSecondaryColor]),
    };
  });

  // @contract: animates maxWidth from generous (hero) to constrained (collapsed) on scroll
  const titleMaxWidthStyle = useAnimatedStyle(() => {
    const navW = navLeftWidth.value;
    if (navW === 0) return {};
    const p = interpolate(scrollOffset.value, [0, HERO_HEIGHT], [0, 1], Extrapolation.CLAMP);
    // Hero: title starts after expanded poster, extends to right edge
    const heroMax = screenWidth - (heroPosterCX + POSTER_EXPANDED_W / 2 + 12) - 16;
    // Collapsed: available area between nav buttons and right edge
    const collapsedMax =
      (screenWidth - 16 - (navW + 16 + 6) - POSTER_COLLAPSED_W - COLLAPSED_GAP) / TITLE_SCALE;
    return { maxWidth: interpolate(p, [0, 1], [heroMax, collapsedMax]) };
  });

  return {
    animatedPosterStyle,
    animatedTitleStyle,
    titleColorStyle,
    subtitleFadeStyle,
    titleMaxWidthStyle,
  };
}
