import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { colors as palette } from '@/theme/colors';
import type { ViewStyle } from 'react-native';

const PROGRESS_BAR_H = 2;
const PROGRESS_BAR_COLOR = palette.red600;

export interface LoadingProgressBarProps {
  /** @contract true once the full-res image has finished loading */
  loaded: boolean;
  /** @contract delay before showing the bar (typically the open animation duration) */
  delayMs: number;
  /** @contract current screen width for translateX calculation */
  screenW: number;
  /** @contract false to skip animations (accessibility) */
  animationsEnabled: boolean;
}

/**
 * @contract Returns two animated styles for a loading progress bar:
 * containerStyle (positioned at top, fades in/out) and fillStyle (sliding bar).
 * The bar appears after delayMs if the image hasn't loaded yet, and hides when loaded.
 */
export function useLoadingProgressBar({
  loaded,
  delayMs,
  screenW,
  animationsEnabled,
}: LoadingProgressBarProps): {
  containerStyle: ViewStyle;
  fillStyle: ViewStyle;
} {
  const progressX = useSharedValue(-1);
  const progressBarOpacity = useSharedValue(0);

  useEffect(() => {
    if (!animationsEnabled) return;
    const delay = setTimeout(() => {
      if (!loaded) {
        progressBarOpacity.value = withTiming(1, { duration: 200 });
        progressX.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(-1, { duration: 0 }),
          ),
          -1,
        );
      }
    }, delayMs);
    return () => clearTimeout(delay);
  }, [loaded, progressX, progressBarOpacity, animationsEnabled, delayMs]);

  useEffect(() => {
    if (loaded) {
      cancelAnimation(progressX);
      progressBarOpacity.value = animationsEnabled
        ? withTiming(0, { duration: 300 })
        : /* istanbul ignore next */ 0;
    }
  }, [loaded, progressX, progressBarOpacity, animationsEnabled]);

  /* istanbul ignore next -- Reanimated worklet cannot execute in Jest */
  const containerStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: PROGRESS_BAR_H,
    overflow: 'hidden' as const,
    opacity: progressBarOpacity.value,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '40%' as unknown as number,
    height: PROGRESS_BAR_H,
    backgroundColor: PROGRESS_BAR_COLOR,
    borderRadius: PROGRESS_BAR_H / 2,
    transform: [{ translateX: progressX.value * screenW * 0.6 + screenW * 0.3 }],
  }));

  return { containerStyle, fillStyle };
}
