import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, BackHandler, TouchableOpacity, type View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { ImageViewerGestures } from './ImageViewerGestures';
import { colors as palette } from '@/theme/colors';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { overlayStyles as styles } from './ImageViewerOverlay.styles';
import { measureView } from '@/utils/measureView';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import type { ImageSourceLayout } from '@/providers/ImageViewerProvider';

// ─── CRITICAL: Bottom panel tuck-in during close ───
// The poster tucks behind the tab bar (80px) during close via an animated clip zone.
// HOW IT WORKS:
//   - clipStyle: Animated.View with overflow:'hidden', anchored at top:0, shrinks via bottom:80*q
//   - Wraps the gesture area so the poster is clipped at the tab bar edge
//   - clipNow shared value: 0 for swipe (gradual ramp), 1 for X button (instant clip)
//   - Backdrop is OUTSIDE the clip zone (full-screen, fades normally)
// *** DO NOT move the backdrop inside the clip zone — causes black flash in panel zones ***
// *** DO NOT use transform-based animation (scale/translate) — distorts or crops image ***
// *** DO NOT add top panel clipping — 9 approaches tried, all caused black flash/artifacts ***
// *** DO NOT change the clip zone to use 'top' property — only 'bottom' works without flash ***
// *** DO NOT add opacity/fade to the image container during close — looks ugly ***
// See memory: feedback_image_viewer_no_hacks.md for full list of failed approaches.
export interface ImageViewerOverlayProps {
  feedUrl: string;
  fullUrl: string;
  sourceLayout: ImageSourceLayout;
  sourceRef: React.RefObject<View | null>;
  borderRadius: number;
  onSourceHide?: () => void;
  onSourceShow?: () => void;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// @assumes All poster images follow 2:3 aspect ratio
const POSTER_ASPECT = 3 / 2;
const OPEN_DURATION = 300;
const CLOSE_DURATION = 250;
const EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const PROGRESS_BAR_H = 2;
const PROGRESS_BAR_COLOR = palette.red600;

export function ImageViewerOverlay({
  feedUrl,
  fullUrl,
  sourceLayout,
  sourceRef,
  borderRadius: srcRadius,
  onSourceHide,
  onSourceShow,
  onClose,
}: ImageViewerOverlayProps) {
  const animationsEnabled = useAnimationsEnabled();
  // @edge When animations disabled, progress/backdrop start at final values (no transition)
  const progress = useSharedValue(animationsEnabled ? 0 : 1);
  const backdropOpacity = useSharedValue(animationsEnabled ? 0 : 1);
  // @invariant closingRef prevents double-close from concurrent button press and swipe dismiss
  const closingRef = useRef(false);
  // Bottom panel clip: 1 = instant full clip (X button), 0 = gradual ramp (swipe)
  // *** DO NOT remove — poster overlaps tab bar without this ***
  const clipNow = useSharedValue(0);

  // Gesture shared values — owned here so we can animate zoom-out on close
  const gestureScale = useSharedValue(1);
  const gestureTranslateX = useSharedValue(0);
  const gestureTranslateY = useSharedValue(0);
  // @sync 1 while a drag-to-dismiss swipe is in progress; drives instant close-button hide
  const isDragging = useSharedValue(0);

  // @sync Source position re-measured on close so fly-back targets correct position after scroll
  const srcX = useSharedValue(sourceLayout.x);
  const srcY = useSharedValue(sourceLayout.y);
  const srcW = useSharedValue(sourceLayout.width);
  const srcH = useSharedValue(sourceLayout.height);

  // Target: poster centered on screen at full width
  const tgtW = SCREEN_W;
  const tgtH = SCREEN_W * POSTER_ASPECT;
  const tgtX = 0;
  const tgtY = (SCREEN_H - tgtH) / 2;

  const [fullResLoaded, setFullResLoaded] = useState(false);
  const progressX = useSharedValue(-1);
  const progressBarOpacity = useSharedValue(0);

  // Start indeterminate animation after the open transition finishes
  useEffect(() => {
    if (!animationsEnabled) return;
    const delay = setTimeout(() => {
      /* istanbul ignore else */
      if (!fullResLoaded) {
        progressBarOpacity.value = withTiming(1, { duration: 200 });
        progressX.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(-1, { duration: 0 }),
          ),
          -1,
        );
      }
    }, OPEN_DURATION);
    return () => clearTimeout(delay);
  }, [fullResLoaded, progressX, progressBarOpacity, animationsEnabled]);

  // Fade out progress bar and cancel infinite animation when full-res loads
  useEffect(() => {
    if (fullResLoaded) {
      cancelAnimation(progressX);
      progressBarOpacity.value = animationsEnabled
        ? withTiming(0, { duration: 300 })
        : /* istanbul ignore next */ 0;
    }
  }, [fullResLoaded, progressX, progressBarOpacity, animationsEnabled]);

  /* istanbul ignore next -- Reanimated worklet cannot execute in Jest */
  const progressBarContainerStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: PROGRESS_BAR_H,
    overflow: 'hidden' as const,
    opacity: progressBarOpacity.value,
  }));

  const progressBarFillStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '40%' as unknown as number,
    height: PROGRESS_BAR_H,
    backgroundColor: PROGRESS_BAR_COLOR,
    borderRadius: PROGRESS_BAR_H / 2,
    transform: [{ translateX: progressX.value * SCREEN_W * 0.6 + SCREEN_W * 0.3 }],
  }));

  // Animate open on mount, then hide source thumbnail once backdrop is opaque
  useEffect(() => {
    if (animationsEnabled) {
      progress.value = withTiming(1, { duration: OPEN_DURATION, easing: EASING });
      backdropOpacity.value = withTiming(1, { duration: OPEN_DURATION, easing: EASING });
      const timer = setTimeout(() => onSourceHide?.(), OPEN_DURATION);
      return () => clearTimeout(timer);
    }
    // Animations disabled — already at final values, hide source immediately
    onSourceHide?.();
    return undefined;
  }, [progress, backdropOpacity, onSourceHide, animationsEnabled]);

  const cleanup = useCallback(() => {
    onSourceShow?.();
    onClose();
  }, [onClose, onSourceShow]);

  const animateClose = useCallback(
    (dur: number) => {
      progress.value = withTiming(0, { duration: dur, easing: EASING }, (finished) => {
        /* istanbul ignore else */
        if (finished) runOnJS(cleanup)();
      });
      backdropOpacity.value = withTiming(0, { duration: dur, easing: EASING });
    },
    [progress, backdropOpacity, cleanup],
  );

  const doFlyBack = useCallback(() => {
    measureView(
      sourceRef,
      (layout) => {
        srcX.value = layout.x;
        srcY.value = layout.y;
        srcW.value = layout.width;
        srcH.value = layout.height;
        animateClose(CLOSE_DURATION);
      },
      () => animateClose(200),
    );
  }, [sourceRef, srcX, srcY, srcW, srcH, animateClose]);

  const handleCloseButton = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (!animationsEnabled) {
      cleanup();
      return;
    }

    clipNow.value = 1; // Snap clip to full so poster never peeks below tab bar
    if (gestureScale.value > 1.05) {
      gestureScale.value = withTiming(1, { duration: CLOSE_DURATION, easing: EASING });
      gestureTranslateX.value = withTiming(0, { duration: CLOSE_DURATION, easing: EASING });
      gestureTranslateY.value = withTiming(0, { duration: CLOSE_DURATION, easing: EASING });
    }
    doFlyBack();
  }, [gestureScale, gestureTranslateX, gestureTranslateY, doFlyBack, animationsEnabled, cleanup]);

  const handleSwipeDismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (!animationsEnabled) {
      cleanup();
      return;
    }
    animateClose(CLOSE_DURATION);
  }, [animateClose, animationsEnabled, cleanup]);

  // Android back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseButton();
      return true;
    });
    return () => sub.remove();
  }, [handleCloseButton]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      position: 'absolute',
      left: srcX.value + (tgtX - srcX.value) * p,
      top: srcY.value + (tgtY - srcY.value) * p,
      width: srcW.value + (tgtW - srcW.value) * p,
      height: srcH.value + (tgtH - srcH.value) * p,
      borderRadius: srcRadius * (1 - p),
      overflow: 'hidden' as const,
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Close button: appears immediately on open, hidden instantly on drag-to-dismiss
  const animatedCloseBtnStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value === 1 ? 0 : progress.value > 0.1 ? 1 : 0,
  }));

  // Bottom panel clip: anchored at top:0, shrinks from bottom via 'bottom' property.
  // The view NEVER moves (top:0 is fixed) — only its bottom edge changes.
  // This is critical: using 'top' to clip causes a compositing flash on iOS.
  // clipNow=1 (X button): instant full clip. Otherwise: gradual ramp via *2 multiplier.
  // 80 = tab bar height. *** DO NOT change without verifying tab bar height. ***
  const clipStyle = useAnimatedStyle(() => {
    const q = clipNow.value === 1 ? 1 : Math.min(1, (1 - progress.value) * 2);
    return {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 80 * q,
      overflow: 'hidden' as const,
    };
  });

  return (
    <Animated.View style={styles.root} pointerEvents="auto">
      <StatusBar style="light" />
      {/* Backdrop MUST be outside clipStyle — putting it inside causes black flash */}
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
      {/* Clip zone wraps gesture area so poster tucks behind tab bar on close */}
      <Animated.View style={clipStyle}>
        <ImageViewerGestures
          onDismiss={handleSwipeDismiss}
          backdropOpacity={backdropOpacity}
          scale={gestureScale}
          translateX={gestureTranslateX}
          translateY={gestureTranslateY}
          isDragging={isDragging}
        >
          <Animated.View style={[styles.gestureArea]}>
            <Animated.View style={animatedContainerStyle}>
              <Image
                source={{ uri: feedUrl || PLACEHOLDER_POSTER }}
                style={styles.imageFill}
                contentFit="cover"
              />
              <Image
                source={{ uri: fullUrl || PLACEHOLDER_POSTER }}
                style={styles.imageFill}
                contentFit="cover"
                transition={300}
                onLoad={() => setFullResLoaded(true)}
              />
              <Animated.View style={progressBarContainerStyle}>
                <Animated.View style={progressBarFillStyle} />
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </ImageViewerGestures>
      </Animated.View>
      <Animated.View style={[styles.closeBtnWrapper, animatedCloseBtnStyle]}>
        <TouchableOpacity onPress={handleCloseButton} accessibilityLabel="Close image" hitSlop={16}>
          <Ionicons name="close" size={20} color={palette.white} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}
