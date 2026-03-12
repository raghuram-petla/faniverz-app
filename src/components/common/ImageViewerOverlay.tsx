import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StatusBar, BackHandler, TouchableOpacity, type View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
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
  const progress = useSharedValue(animationsEnabled ? 0 : 1);
  const backdropOpacity = useSharedValue(animationsEnabled ? 0 : 1);
  const closingRef = useRef(false);

  // Gesture shared values — owned here so we can animate zoom-out on close
  const gestureScale = useSharedValue(1);
  const gestureTranslateX = useSharedValue(0);
  const gestureTranslateY = useSharedValue(0);

  // Source position — updated on close for scroll-aware fly-back
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

  // Fade out progress bar when full-res loads
  useEffect(() => {
    if (fullResLoaded) {
      progressBarOpacity.value = animationsEnabled ? withTiming(0, { duration: 300 }) : 0;
    }
  }, [fullResLoaded, progressBarOpacity, animationsEnabled]);

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
        if (finished) runOnJS(cleanup)();
      });
      backdropOpacity.value = withTiming(0, { duration: dur, easing: EASING });
    },
    [progress, backdropOpacity, cleanup],
  );

  // Fly back to thumbnail (re-measure, then animate)
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

  // Close: reset gesture transforms and fly back simultaneously (no jerk)
  const handleCloseButton = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (!animationsEnabled) {
      cleanup();
      return;
    }

    if (gestureScale.value > 1.05) {
      gestureScale.value = withTiming(1, { duration: CLOSE_DURATION, easing: EASING });
      gestureTranslateX.value = withTiming(0, { duration: CLOSE_DURATION, easing: EASING });
      gestureTranslateY.value = withTiming(0, { duration: CLOSE_DURATION, easing: EASING });
    }
    doFlyBack();
  }, [gestureScale, gestureTranslateX, gestureTranslateY, doFlyBack, animationsEnabled, cleanup]);

  // Swipe dismiss: gesture resets its own transforms simultaneously
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

  // Animated image container: interpolates position/size/borderRadius
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

  const animatedCloseBtnStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return (
    <Animated.View style={styles.root} pointerEvents="auto">
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />

      <ImageViewerGestures
        onDismiss={handleSwipeDismiss}
        backdropOpacity={backdropOpacity}
        scale={gestureScale}
        translateX={gestureTranslateX}
        translateY={gestureTranslateY}
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

      <Animated.View style={[styles.closeBtnWrapper, animatedCloseBtnStyle]}>
        <TouchableOpacity onPress={handleCloseButton} accessibilityLabel="Close image">
          <Ionicons name="close" size={28} color={palette.white} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}
