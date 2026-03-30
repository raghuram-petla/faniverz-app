import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, TouchableOpacity, useWindowDimensions, type View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarHidden } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { ImageViewerGestures } from './ImageViewerGestures';
import { useLoadingProgressBar } from './useLoadingProgressBar';
import { useImageTargetResize } from './useImageTargetResize';
import { colors as palette } from '@/theme/colors';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { overlayStyles as styles } from './ImageViewerOverlay.styles';
import { measureView } from '@/utils/measureView';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import { useDeviceLandscape } from '@/hooks/useDeviceLandscape';
import { HomeFeedTopChromeMask } from '@/components/feed/HomeFeedTopChromeMask';
import type { ImageSourceLayout, ImageViewerTopChrome } from '@/providers/ImageViewerProvider';
export interface ImageViewerOverlayProps {
  feedUrl: string;
  fullUrl: string;
  sourceLayout: ImageSourceLayout;
  sourceRef: React.RefObject<View | null>;
  borderRadius: number;
  /** @contract when true, uses 16:9 landscape aspect ratio; screen stays portrait-locked,
   * device tilt detected via accelerometer triggers CSS rotation of the image only. */
  isLandscape?: boolean;
  topChrome?: ImageViewerTopChrome;
  onSourceHide?: () => void;
  onSourceShow?: () => void;
  onClose: () => void;
}

// @assumes All poster images follow 2:3 aspect ratio.
const POSTER_ASPECT = 3 / 2;
const OPEN_DURATION = 400;
const CLOSE_DURATION = 400;
const ROTATION_DURATION = 300;
const EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
export function ImageViewerOverlay({
  feedUrl,
  fullUrl,
  sourceLayout,
  sourceRef,
  borderRadius: srcRadius,
  isLandscape,
  topChrome,
  onSourceHide,
  onSourceShow,
  onClose,
}: ImageViewerOverlayProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const animationsEnabled = useAnimationsEnabled();
  const progress = useSharedValue(animationsEnabled ? 0 : 1);
  const backdropOpacity = useSharedValue(animationsEnabled ? 0 : 1);
  const closingRef = useRef(false);
  const clipNow = useSharedValue(0);
  const gestureScale = useSharedValue(1);
  const gestureTranslateX = useSharedValue(0);
  const gestureTranslateY = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const closing = useSharedValue(0);
  const srcX = useSharedValue(sourceLayout.x);
  const srcY = useSharedValue(sourceLayout.y);
  const srcW = useSharedValue(sourceLayout.width);
  const srcH = useSharedValue(sourceLayout.height);
  const {
    dynTgtW,
    dynTgtH,
    handleFullImageLoad: resizeOnLoad,
  } = useImageTargetResize(!!isLandscape, screenW, screenH);
  // @contract Screen stays portrait-locked. Accelerometer detects physical tilt.
  // When tilted to landscape, CSS rotation + rescaling applied to image container only.
  // The feed behind never rotates — only the image does.
  // @contract Returns 0 (portrait), 90 (tilted left), or -90 (tilted right).
  const deviceRotation = useDeviceLandscape(!!isLandscape);
  const deviceLandscape = deviceRotation !== 0;
  const rotation = useSharedValue(0);
  // @contract Portrait target: normal 16:9 bar. Landscape target: pre-rotation container
  // sized so that after 90° CSS rotation, visual width=screenW, visual height=screenW*16/9.
  const portraitTgtW = screenW;
  const portraitTgtH = screenW * (isLandscape ? 9 / 16 : POSTER_ASPECT);
  const landscapeTgtW = screenW * (16 / 9);
  const landscapeTgtH = screenW;
  const tgtW = deviceLandscape ? landscapeTgtW : portraitTgtW;
  const tgtH = deviceLandscape ? landscapeTgtH : portraitTgtH;
  // @sideeffect Animate rotation when device tilt changes (only while not closing).
  // Honors tilt direction: 90° for left tilt, -90° for right tilt.
  useEffect(() => {
    if (closingRef.current) return;
    rotation.value = animationsEnabled
      ? withTiming(deviceRotation, { duration: ROTATION_DURATION, easing: EASING })
      : deviceRotation;
  }, [deviceRotation, rotation, animationsEnabled]);

  const [fullResLoaded, setFullResLoaded] = useState(false);
  const { containerStyle: progressBarContainerStyle, fillStyle: progressBarFillStyle } =
    useLoadingProgressBar({
      loaded: fullResLoaded,
      delayMs: OPEN_DURATION,
      screenW,
      animationsEnabled,
    });
  const topChromeBoundary =
    topChrome?.variant === 'home-feed'
      ? topChrome.insetTop + Math.max(0, topChrome.headerContentHeight + topChrome.headerTranslateY)
      : 0;
  const needsTopChromeOcclusion =
    topChrome?.variant === 'home-feed' && sourceLayout.y < topChromeBoundary;

  // @sideeffect Hide status bar when fullscreen overlay opens; restore on unmount.
  useEffect(() => {
    setStatusBarHidden(true, 'fade');
    return () => setStatusBarHidden(false, 'fade');
  }, []);

  useEffect(() => {
    onSourceHide?.();
    if (animationsEnabled) {
      progress.value = withTiming(1, { duration: OPEN_DURATION, easing: EASING });
      backdropOpacity.value = withTiming(1, { duration: OPEN_DURATION, easing: EASING });
    }
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
      backdropOpacity.value = 0;
      // @sideeffect Animate rotation back to 0 during fly-back so image un-rotates smoothly.
      rotation.value = withTiming(0, { duration: dur, easing: EASING });
    },
    [progress, backdropOpacity, rotation, cleanup],
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
    closing.value = 1;

    if (!animationsEnabled) {
      cleanup();
      return;
    }
    clipNow.value = 1;
    if (gestureScale.value > 1.05) {
      gestureScale.value = withTiming(1, { duration: CLOSE_DURATION, easing: EASING });
      gestureTranslateX.value = withTiming(0, { duration: CLOSE_DURATION, easing: EASING });
      gestureTranslateY.value = withTiming(0, { duration: CLOSE_DURATION, easing: EASING });
    }
    doFlyBack();
  }, [
    gestureScale,
    gestureTranslateX,
    gestureTranslateY,
    doFlyBack,
    animationsEnabled,
    cleanup,
    closing,
  ]);

  const handleSwipeDismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    closing.value = 1;

    if (!animationsEnabled) {
      cleanup();
      return;
    }
    animateClose(CLOSE_DURATION);
  }, [animateClose, animationsEnabled, cleanup, closing]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseButton();
      return true;
    });
    return () => sub.remove();
  }, [handleCloseButton]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // For landscape (device tilted), use fixed pre-rotation dimensions.
    // For portrait, use dynTgtW/dynTgtH which update to the actual image aspect ratio on load.
    const tw = deviceLandscape ? landscapeTgtW : dynTgtW.value;
    const th = deviceLandscape ? landscapeTgtH : dynTgtH.value;
    const tx = deviceLandscape ? (screenW - landscapeTgtW) / 2 : (screenW - dynTgtW.value) / 2;
    const ty = (screenH - th) / 2;
    return {
      position: 'absolute',
      left: srcX.value + (tx - srcX.value) * p,
      top: srcY.value + (ty - srcY.value) * p,
      width: srcW.value + (tw - srcW.value) * p,
      height: srcH.value + (th - srcH.value) * p,
      borderRadius: srcRadius * (1 - p),
      overflow: 'hidden' as const,
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });
  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const animatedCloseBtnStyle = useAnimatedStyle(() => ({
    opacity: closing.value === 1 || isDragging.value === 1 ? 0 : progress.value > 0.1 ? 1 : 0,
  }));
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
  // @sync Mask snaps: visible immediately on close, hidden immediately on open.
  const topChromeMaskStyle = useAnimatedStyle(() => ({
    opacity: closing.value === 1 ? 1 : backdropOpacity.value > 0 ? 0 : 1,
  }));

  return (
    <Animated.View style={styles.root} pointerEvents="auto">
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
      <Animated.View style={clipStyle}>
        <ImageViewerGestures
          onDismiss={handleSwipeDismiss}
          backdropOpacity={backdropOpacity}
          scale={gestureScale}
          translateX={gestureTranslateX}
          translateY={gestureTranslateY}
          isDragging={isDragging}
          imageHeight={deviceLandscape ? tgtW : tgtH}
          imageWidth={deviceLandscape ? tgtH : tgtW}
          currentScreenW={screenW}
          currentScreenH={screenH}
        >
          <Animated.View style={[styles.gestureArea, { width: screenW, height: screenH }]}>
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
                onLoad={(e) => {
                  resizeOnLoad(e);
                  setFullResLoaded(true);
                }}
              />
              <Animated.View style={progressBarContainerStyle}>
                <Animated.View style={progressBarFillStyle} />
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </ImageViewerGestures>
      </Animated.View>
      {needsTopChromeOcclusion && topChrome ? (
        <HomeFeedTopChromeMask
          topChrome={topChrome}
          animatedStyle={topChromeMaskStyle}
          showHeaderChrome
        />
      ) : null}
      {!deviceLandscape ? (
        <Animated.View
          style={[styles.closeBtnWrapper, { top: insets.top + 12 }, animatedCloseBtnStyle]}
        >
          <TouchableOpacity
            accessibilityLabel="Close image"
            hitSlop={16}
            onPress={handleCloseButton}
          >
            <Ionicons name="close" size={20} color={palette.white} />
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
