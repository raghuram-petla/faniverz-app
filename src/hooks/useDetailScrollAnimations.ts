import {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

/** Poster size in the hero (expanded) state */
export const DETAIL_POSTER_EXPANDED_W = 112;
export const DETAIL_POSTER_EXPANDED_H = 168;
/** Poster size in the nav bar (collapsed) state */
export const DETAIL_POSTER_COLLAPSED_W = 28;
export const DETAIL_POSTER_COLLAPSED_H = 42;
/** Title scale factor: collapsed font / hero font (14/28) */
export const DETAIL_TITLE_SCALE = 14 / 28;
/** Scroll distance over which the collapse animation runs */
export const DETAIL_SCROLL_THRESHOLD = 280;

const COLLAPSED_GAP = 8;

export interface DetailScrollAnimationsProps {
  scrollOffset: SharedValue<number>;
  titleWidth: SharedValue<number>;
  titleHeight: SharedValue<number>;
  navLeftWidth: SharedValue<number>;
  navRightWidth: SharedValue<number>;
  screenWidth: number;
  /** Center X of the poster in the hero (expanded) position */
  heroPosterCX: number;
  /** Center Y of the poster in the hero (expanded) position */
  heroPosterCY: number;
  /** Center Y of the nav bar row */
  navCenterY: number;
  textPrimaryColor: string;
}

/**
 * @contract Returns animated styles for floating poster and title that transition
 * between hero (expanded) and nav-bar (collapsed) states on scroll.
 * @coupling DETAIL_SCROLL_THRESHOLD, DETAIL_POSTER_*, DETAIL_TITLE_SCALE constants
 */
export function useDetailScrollAnimations({
  scrollOffset,
  titleWidth,
  titleHeight,
  navLeftWidth,
  navRightWidth,
  screenWidth,
  heroPosterCX,
  heroPosterCY,
  navCenterY,
  textPrimaryColor,
}: DetailScrollAnimationsProps) {
  const T = DETAIL_SCROLL_THRESHOLD;

  /**
   * @contract Centers the collapsed poster+title group between nav buttons.
   * @sync Runs on UI thread ('worklet').
   */
  const getCollapsedGroupLeft = (titleVisualW: number, navLW: number, navRW: number) => {
    'worklet';
    const groupW = DETAIL_POSTER_COLLAPSED_W + COLLAPSED_GAP + titleVisualW;
    if (navLW === 0) return (screenWidth - groupW) / 2;
    const areaLeft = navLW + 16 + 6;
    const areaRight = screenWidth - 16 - navRW - 6;
    return Math.max(areaLeft + (areaRight - areaLeft - groupW) / 2, areaLeft);
  };

  // @boundary: p interpolates [0,1] over DETAIL_SCROLL_THRESHOLD; clamped
  const animatedPosterStyle = useAnimatedStyle(() => {
    const s = scrollOffset.value;
    const p = interpolate(s, [0, T], [0, 1], Extrapolation.CLAMP);

    const titleVisualW = titleWidth.value * DETAIL_TITLE_SCALE;
    const groupLeft = getCollapsedGroupLeft(titleVisualW, navLeftWidth.value, navRightWidth.value);
    const collapsedCX = groupLeft + DETAIL_POSTER_COLLAPSED_W / 2;

    const cy = (heroPosterCY - s) * (1 - p) + navCenterY * p;
    const cx = heroPosterCX * (1 - p) + collapsedCX * p;
    const scale = interpolate(p, [0, 1], [1, DETAIL_POSTER_COLLAPSED_W / DETAIL_POSTER_EXPANDED_W]);

    return {
      transform: [
        { translateX: cx - DETAIL_POSTER_EXPANDED_W / 2 },
        { translateY: cy - DETAIL_POSTER_EXPANDED_H / 2 },
        { scale },
      ],
    };
  });

  const animatedTitleStyle = useAnimatedStyle(() => {
    const s = scrollOffset.value;
    const p = interpolate(s, [0, T], [0, 1], Extrapolation.CLAMP);

    const W = titleWidth.value;
    const H = titleHeight.value;
    const scale = interpolate(p, [0, 1], [1, DETAIL_TITLE_SCALE]);

    const titleVisualW = W * DETAIL_TITLE_SCALE;
    const groupLeft = getCollapsedGroupLeft(titleVisualW, navLeftWidth.value, navRightWidth.value);
    const collapsedNameCX =
      groupLeft + DETAIL_POSTER_COLLAPSED_W + COLLAPSED_GAP + titleVisualW / 2;

    // Hero: right of poster, vertically centered with poster
    const heroTitleCY = heroPosterCY;
    const cy = (heroTitleCY - s) * (1 - p) + navCenterY * p;

    const heroTX = heroPosterCX + DETAIL_POSTER_EXPANDED_W / 2 + 16;
    const collapsedTX = collapsedNameCX - W / 2;

    return {
      transform: [
        { translateX: heroTX * (1 - p) + collapsedTX * p },
        { translateY: cy - H / 2 },
        { scale },
      ],
    };
  });

  /** @sideeffect Title color transitions from white (over backdrop) to theme color */
  const titleColorStyle = useAnimatedStyle(() => {
    const p = interpolate(scrollOffset.value, [0, T], [0, 1], Extrapolation.CLAMP);
    return { color: interpolateColor(p, [0, 1], ['#FFFFFF', textPrimaryColor]) };
  });

  /** @sideeffect Hero info (rating, meta, badge) fades out during first 40% of scroll */
  const heroInfoFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollOffset.value, [0, T * 0.4], [1, 0], Extrapolation.CLAMP),
  }));

  /** @sideeffect Nav bar background fades from transparent to solid */
  const navBarBgStyle = useAnimatedStyle(() => {
    const p = interpolate(scrollOffset.value, [T * 0.6, T], [0, 1], Extrapolation.CLAMP);
    return { opacity: p };
  });

  // @contract: animates maxWidth from generous (hero) to constrained (collapsed)
  const titleMaxWidthStyle = useAnimatedStyle(() => {
    const navLW = navLeftWidth.value;
    const navRW = navRightWidth.value;
    if (navLW === 0) return {};
    const p = interpolate(scrollOffset.value, [0, T], [0, 1], Extrapolation.CLAMP);
    const heroMax = screenWidth - (heroPosterCX + DETAIL_POSTER_EXPANDED_W / 2 + 16) - 16;
    const collapsedMax =
      (screenWidth -
        16 -
        (navLW + 16 + 6) -
        navRW -
        6 -
        DETAIL_POSTER_COLLAPSED_W -
        COLLAPSED_GAP) /
      DETAIL_TITLE_SCALE;
    return { maxWidth: interpolate(p, [0, 1], [heroMax, Math.max(collapsedMax, 60)]) };
  });

  return {
    animatedPosterStyle,
    animatedTitleStyle,
    titleColorStyle,
    heroInfoFadeStyle,
    navBarBgStyle,
    titleMaxWidthStyle,
  };
}
