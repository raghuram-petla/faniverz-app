import { useCallback } from 'react';
import { Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDecay,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * @contract Wraps children in pinch-zoom, pan, and double-tap gesture handlers.
 * @coupling ImageViewerOverlay — owns scale/translateX/translateY so it can coordinate close animations.
 * @sync All shared values run on the UI thread (worklets); onDismiss bridges back to JS via runOnJS.
 */
export interface ImageViewerGesturesProps {
  children: React.ReactNode;
  onDismiss: () => void;
  /** Backdrop opacity driven by drag-to-dismiss (0-1). */
  backdropOpacity: SharedValue<number>;
  /** Gesture scale -- owned by parent (ImageViewerOverlay) so it can animate zoom-out on close. */
  scale: SharedValue<number>;
  /** Gesture translateX -- owned by parent. */
  translateX: SharedValue<number>;
  /** Gesture translateY -- owned by parent. */
  translateY: SharedValue<number>;
}

export const MAX_SCALE = 4;
export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
export const IMG_W = SCREEN_W;
// @assumes Poster images are 2:3 aspect ratio
export const IMG_H = SCREEN_W * 1.5; // 2:3 poster
export const Y_OVERSCROLL = 150;
// @invariant Swipe distance must exceed this threshold (px) to trigger dismiss
const DISMISS_THRESHOLD = 100;

/** @boundary Clamps horizontal translation so the image edge never moves past screen center */
export function clampX(x: number, s: number): number {
  'worklet';
  const maxX = Math.max(0, (IMG_W * s - SCREEN_W) / 2);
  return Math.min(maxX, Math.max(-maxX, x));
}

/** @boundary Clamps vertical translation; adds Y_OVERSCROLL for elastic bounce past image edges */
export function clampY(y: number, s: number): number {
  'worklet';
  const maxY = Math.max(0, (IMG_H * s - SCREEN_H) / 2) + Y_OVERSCROLL;
  return Math.min(maxY, Math.max(-maxY, y));
}

export function ImageViewerGestures({
  children,
  onDismiss,
  backdropOpacity,
  scale,
  translateX,
  translateY,
}: ImageViewerGesturesProps) {
  // Saved values stay internal — synced from current values at gesture start
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  /** @sideeffect Animates all transforms back to identity and restores backdrop opacity */
  const resetTransforms = useCallback(() => {
    'worklet';
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    backdropOpacity.value = withTiming(1);
  }, [
    scale,
    translateX,
    translateY,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    backdropOpacity,
  ]);

  // @invariant Scale is clamped to [1, MAX_SCALE]; pinch below 1 snaps back on end
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        resetTransforms();
      } else {
        translateX.value = withTiming(clampX(translateX.value, scale.value));
        translateY.value = withTiming(clampY(translateY.value, scale.value));
        savedTranslateX.value = clampX(translateX.value, scale.value);
        savedTranslateY.value = clampY(translateY.value, scale.value);
      }
    });

  // @edge At scale=1, pan drives drag-to-dismiss; at scale>1, pan pans the zoomed image
  const pan = Gesture.Pan()
    .minPointers(1)
    .onStart(() => {
      // Sync saved values from current — handles external reset (zoom-out on close)
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = clampX(savedTranslateX.value + e.translationX, scale.value);
        translateY.value = clampY(savedTranslateY.value + e.translationY, scale.value);
      } else {
        translateY.value = e.translationY;
        backdropOpacity.value = 1 - Math.min(1, Math.abs(e.translationY) / (SCREEN_H * 0.4));
      }
    })
    .onEnd((e) => {
      if (scale.value <= 1) {
        if (Math.abs(e.translationY) > DISMISS_THRESHOLD) {
          // Reset gesture transforms so they don't conflict with fly-back
          translateY.value = withTiming(0, { duration: 250 });
          translateX.value = withTiming(0, { duration: 250 });
          scale.value = withTiming(1, { duration: 250 });
          savedScale.value = 1;
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
          runOnJS(onDismiss)();
        } else {
          translateY.value = withTiming(0);
          backdropOpacity.value = withTiming(1);
        }
      } else {
        const s = scale.value;
        const maxX = Math.max(0, (IMG_W * s - SCREEN_W) / 2);
        const maxY = Math.max(0, (IMG_H * s - SCREEN_H) / 2) + Y_OVERSCROLL;
        translateX.value = withDecay({
          velocity: e.velocityX,
          deceleration: 0.9994,
          clamp: [-maxX, maxX],
        });
        translateY.value = withDecay({
          velocity: e.velocityY,
          deceleration: 0.9994,
          clamp: [-maxY, maxY],
        });
      }
    });

  // @sideeffect Double-tap toggles between MAX_SCALE (focal zoom) and identity
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.value > 1) {
        resetTransforms();
      } else {
        // Zoom into the tap position: translate so the tapped point stays in place
        const focalX = e.x - SCREEN_W / 2;
        const focalY = e.y - SCREEN_H / 2;
        const tx = clampX(focalX * (1 - MAX_SCALE), MAX_SCALE);
        const ty = clampY(focalY * (1 - MAX_SCALE), MAX_SCALE);
        scale.value = withTiming(MAX_SCALE);
        translateX.value = withTiming(tx);
        translateY.value = withTiming(ty);
        savedScale.value = MAX_SCALE;
        savedTranslateX.value = tx;
        savedTranslateY.value = ty;
      }
    });

  // @contract Pinch runs simultaneously with pan/double-tap; double-tap and pan race (first recognized wins)
  const gesture = Gesture.Simultaneous(pinch, Gesture.Race(doubleTap, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
