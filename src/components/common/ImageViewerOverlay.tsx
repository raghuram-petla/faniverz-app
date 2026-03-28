import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, TouchableOpacity, useWindowDimensions, type View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
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
import { HomeFeedTopChromeMask } from '@/components/feed/HomeFeedTopChromeMask';
import type { ImageSourceLayout, ImageViewerTopChrome } from '@/providers/ImageViewerProvider';
// Bottom tuck-in stays clip-based. Top tuck-in uses a visual chrome mask to avoid iOS artifacts from top clipping.
export interface ImageViewerOverlayProps {
  feedUrl: string;
  fullUrl: string;
  sourceLayout: ImageSourceLayout;
  sourceRef: React.RefObject<View | null>;
  borderRadius: number;
  /** @contract when true, uses 16:9 landscape aspect ratio and unlocks screen rotation */
  isLandscape?: boolean;
  topChrome?: ImageViewerTopChrome;
  onSourceHide?: () => void;
  onSourceShow?: () => void;
  onClose: () => void;
}

// @assumes All poster images follow 2:3 aspect ratio.
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
  const srcX = useSharedValue(sourceLayout.x);
  const srcY = useSharedValue(sourceLayout.y);
  const srcW = useSharedValue(sourceLayout.width);
  const srcH = useSharedValue(sourceLayout.height);
  // @contract For landscape images in landscape orientation, fill the screen
  const isScreenLandscape = screenW > screenH;
  const tgtW = screenW;
  const tgtH =
    isLandscape && isScreenLandscape ? screenH : screenW * (isLandscape ? 9 / 16 : POSTER_ASPECT);
  const tgtX = 0;
  const tgtY = (screenH - tgtH) / 2;
  // @sideeffect Smooth rotation: compute how much the image area changes and
  // start from that ratio so it smoothly grows/shrinks to fill the new layout.
  // Hides full-res image during transition to avoid jank from resizing large files.
  const rotationScale = useSharedValue(1);
  const fullResOpacity = useSharedValue(1);
  const prevTgtW = useRef(tgtW);
  const prevTgtH = useRef(tgtH);
  useEffect(() => {
    if (prevTgtW.current === tgtW && prevTgtH.current === tgtH) return;
    const oldArea = prevTgtW.current * prevTgtH.current;
    const newArea = tgtW * tgtH;
    const startScale = Math.sqrt(oldArea / newArea);
    prevTgtW.current = tgtW;
    prevTgtH.current = tgtH;
    // Hide full-res during rotation, show feed-res only (much lighter)
    fullResOpacity.value = 0;
    rotationScale.value = startScale;
    rotationScale.value = withTiming(1, { duration: 500, easing: EASING }, (finished) => {
      if (finished) fullResOpacity.value = 1;
    });
  }, [tgtW, tgtH, rotationScale, fullResOpacity]);
  const [fullResLoaded, setFullResLoaded] = useState(false);
  const [showClosingTopChrome, setShowClosingTopChrome] = useState(false);
  const progressX = useSharedValue(-1);
  const progressBarOpacity = useSharedValue(0);
  const topChromeBoundary =
    topChrome?.variant === 'home-feed'
      ? topChrome.insetTop + Math.max(0, topChrome.headerContentHeight + topChrome.headerTranslateY)
      : 0;
  const needsTopChromeOcclusion =
    topChrome?.variant === 'home-feed' && sourceLayout.y < topChromeBoundary;

  // @sideeffect unlock screen rotation for landscape images, re-lock on close
  useEffect(() => {
    if (!isLandscape) return;
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [isLandscape]);

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
    transform: [{ translateX: progressX.value * screenW * 0.6 + screenW * 0.3 }],
  }));
  useEffect(() => {
    if (animationsEnabled) {
      progress.value = withTiming(1, { duration: OPEN_DURATION, easing: EASING });
      backdropOpacity.value = withTiming(1, { duration: OPEN_DURATION, easing: EASING });
      const timer = setTimeout(() => onSourceHide?.(), OPEN_DURATION);
      return () => clearTimeout(timer);
    }
    onSourceHide?.();
    return undefined;
  }, [progress, backdropOpacity, onSourceHide, animationsEnabled]);
  // @sideeffect When dismissing from landscape, we lock to portrait first and defer
  // the actual unmount until the screen has rotated back. This prevents the feed
  // from ever being visible in landscape orientation.
  const waitingForPortrait = useRef(false);
  useEffect(() => {
    if (waitingForPortrait.current && !isScreenLandscape) {
      waitingForPortrait.current = false;
      onSourceShow?.();
      onClose();
    }
  }, [isScreenLandscape, onClose, onSourceShow]);

  const cleanup = useCallback(() => {
    if (isScreenLandscape && isLandscape) {
      // Lock to portrait and wait — the useEffect above will unmount once rotated
      waitingForPortrait.current = true;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      return;
    }
    onSourceShow?.();
    onClose();
  }, [isLandscape, isScreenLandscape, onClose, onSourceShow]);
  const animateClose = useCallback(
    (dur: number) => {
      progress.value = withTiming(0, { duration: dur, easing: EASING }, (finished) => {
        if (finished) runOnJS(cleanup)();
      });
      // @contract Keep backdrop opaque when dismissing from landscape
      if (!isScreenLandscape) {
        backdropOpacity.value = withTiming(0, { duration: dur, easing: EASING });
      }
    },
    [progress, backdropOpacity, cleanup, isScreenLandscape],
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
    setShowClosingTopChrome(true);
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
  }, [gestureScale, gestureTranslateX, gestureTranslateY, doFlyBack, animationsEnabled, cleanup]);

  const handleSwipeDismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setShowClosingTopChrome(true);
    if (!animationsEnabled) {
      cleanup();
      return;
    }
    animateClose(CLOSE_DURATION);
  }, [animateClose, animationsEnabled, cleanup]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseButton();
      return true;
    });
    return () => sub.remove();
  }, [handleCloseButton]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const s = rotationScale.value;
    const w = srcW.value + (tgtW - srcW.value) * p;
    const h = srcH.value + (tgtH - srcH.value) * p;
    const x = srcX.value + (tgtX - srcX.value) * p;
    const y = srcY.value + (tgtY - srcY.value) * p;
    return {
      position: 'absolute',
      left: x + (w * (1 - s)) / 2,
      top: y + (h * (1 - s)) / 2,
      width: w * s,
      height: h * s,
      borderRadius: srcRadius * (1 - p),
      overflow: 'hidden' as const,
    };
  });
  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  // @sideeffect Hide full-res image during rotation to avoid jank
  const animatedFullResStyle = useAnimatedStyle(() => ({
    ...styles.imageFill,
    opacity: fullResOpacity.value,
  }));
  const animatedCloseBtnStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value === 1 ? 0 : progress.value > 0.1 ? 1 : 0,
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

  return (
    <Animated.View style={styles.root} pointerEvents="auto">
      <StatusBar style="light" />
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
      <Animated.View style={clipStyle}>
        <ImageViewerGestures
          onDismiss={handleSwipeDismiss}
          backdropOpacity={backdropOpacity}
          scale={gestureScale}
          translateX={gestureTranslateX}
          translateY={gestureTranslateY}
          isDragging={isDragging}
          imageHeight={tgtH}
          imageWidth={tgtW}
          currentScreenW={screenW}
          currentScreenH={screenH}
          keepBackdropOpaque={isScreenLandscape}
        >
          <Animated.View style={[styles.gestureArea, { width: screenW, height: screenH }]}>
            <Animated.View style={animatedContainerStyle}>
              <Image
                source={{ uri: feedUrl || PLACEHOLDER_POSTER }}
                style={styles.imageFill}
                contentFit="cover"
              />
              <Animated.View style={animatedFullResStyle}>
                <Image
                  source={{ uri: fullUrl || PLACEHOLDER_POSTER }}
                  style={styles.imageFill}
                  contentFit="cover"
                  transition={300}
                  onLoad={() => setFullResLoaded(true)}
                />
              </Animated.View>
              <Animated.View style={progressBarContainerStyle}>
                <Animated.View style={progressBarFillStyle} />
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </ImageViewerGestures>
      </Animated.View>
      {showClosingTopChrome && needsTopChromeOcclusion && topChrome ? (
        <HomeFeedTopChromeMask topChrome={topChrome} showHeaderChrome />
      ) : null}
      {!isScreenLandscape ? (
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
