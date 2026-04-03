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
  // @boundary: p interpolates [0,1] over HERO_HEIGHT; clamped so over-scroll has no effect
  const animatedPosterStyle = useAnimatedStyle(() => {
    const s = scrollOffset.value;
    const p = interpolate(s, [0, HERO_HEIGHT], [0, 1], Extrapolation.CLAMP);

    const titleVisualW = titleWidth.value * TITLE_SCALE;
    const groupW = POSTER_COLLAPSED_W + COLLAPSED_GAP + titleVisualW;
    const groupLeft = (screenWidth - groupW) / 2;
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
    const groupW = POSTER_COLLAPSED_W + COLLAPSED_GAP + titleVisualW;
    const groupLeft = (screenWidth - groupW) / 2;
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

  // @contract: dynamically constrains title width so collapsed group doesn't overlap nav buttons
  const titleMaxWidthStyle = useAnimatedStyle(() => {
    const navW = navLeftWidth.value;
    if (navW === 0) return {}; // not measured yet — no constraint
    // Available center = screen - 2*(navLeft + horizontalPadding + safetyGap) - poster - gap
    const available = screenWidth - 2 * (navW + 16 + 8) - POSTER_COLLAPSED_W - COLLAPSED_GAP;
    return { maxWidth: available / TITLE_SCALE };
  });

  return {
    animatedPosterStyle,
    animatedTitleStyle,
    titleColorStyle,
    subtitleFadeStyle,
    titleMaxWidthStyle,
  };
}
