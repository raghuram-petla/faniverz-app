import { useCallback } from 'react';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import type { ImageLoadEventData } from 'expo-image';
import type { SharedValue } from 'react-native-reanimated';

// @assumes Default portrait aspect ratio before actual image dimensions are known.
const POSTER_ASPECT = 3 / 2;
const EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

export interface ImageTargetResize {
  dynTgtW: SharedValue<number>;
  dynTgtH: SharedValue<number>;
  handleFullImageLoad: (event: ImageLoadEventData) => void;
}

/**
 * @contract Provides shared values for the portrait container's target dimensions,
 * initialized to an assumed 2:3 poster ratio. When the full-res image loads,
 * animates to the actual aspect ratio so no part of the image is cropped.
 * @assumes isLandscape images retain fixed 16:9 target — only portrait images are resized.
 */
export function useImageTargetResize(
  isLandscape: boolean,
  screenW: number,
  screenH: number,
): ImageTargetResize {
  const dynTgtW = useSharedValue(screenW);
  const dynTgtH = useSharedValue(isLandscape ? screenW * (9 / 16) : screenW * POSTER_ASPECT);

  // @sideeffect When the full-res image loads, resize the portrait container to match the
  // image's actual aspect ratio. This prevents cover-mode cropping for images that don't
  // match the assumed 2:3 ratio (e.g. square or wide promotional images).
  const handleFullImageLoad = useCallback(
    (event: ImageLoadEventData) => {
      if (!isLandscape) {
        const natW = event?.source?.width ?? 0;
        const natH = event?.source?.height ?? 0;
        if (natW > 0 && natH > 0) {
          const aspect = natW / natH;
          const scrAspect = screenW / screenH;
          const newW = aspect >= scrAspect ? screenW : screenH * aspect;
          const newH = aspect >= scrAspect ? screenW / aspect : screenH;
          dynTgtW.value = withTiming(newW, { duration: 200, easing: EASING });
          dynTgtH.value = withTiming(newH, { duration: 200, easing: EASING });
        }
      }
    },
    [isLandscape, screenW, screenH, dynTgtW, dynTgtH],
  );

  return { dynTgtW, dynTgtH, handleFullImageLoad };
}
