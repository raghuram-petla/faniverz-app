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
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { ImageViewerGestures } from './ImageViewerGestures';
import { useLoadingProgressBar } from './useLoadingProgressBar';
import { colors as palette } from '@/theme/colors';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { overlayStyles as styles } from './ImageViewerOverlay.styles';
import { measureView } from '@/utils/measureView';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import { HomeFeedTopChromeMask } from '@/components/feed/HomeFeedTopChromeMask';
import type { ImageSourceLayout, ImageViewerTopChrome } from '@/providers/ImageViewerProvider';
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
const CLOSE_DURATION = 400;
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
  // @contract For landscape images in landscape orientation, fill the screen
  const isScreenLandscape = screenW > screenH;
  const tgtW = screenW;
  const tgtH =
    isLandscape && isScreenLandscape ? screenH : screenW * (isLandscape ? 9 / 16 : POSTER_ASPECT);
  const tgtX = 0;
  const tgtY = (screenH - tgtH) / 2;
  // @contract No custom rotation animation — the OS rotation provides the
  // visual transition. We just snap to the correct dimensions immediately.
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

  // @sideeffect unlock screen rotation for landscape images, re-lock on close
  useEffect(() => {
    if (!isLandscape) return;
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [isLandscape]);

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
  // @sideeffect When dismissing from landscape, rotate to portrait first,
  // then run the normal fly-back animation into the feed card.
  const waitingForPortrait = useRef(false);
  const doFlyBackRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (waitingForPortrait.current && !isScreenLandscape) {
      waitingForPortrait.current = false;
      // @sideeffect Small delay lets the image settle at portrait dimensions
      // before the fly-back animation starts, so the user sees it shrink first.
      const t = setTimeout(() => {
        clipNow.value = 1;
        doFlyBackRef.current();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [isScreenLandscape, clipNow]);

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
  doFlyBackRef.current = doFlyBack;
  const handleCloseButton = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    closing.value = 1;

    if (!animationsEnabled) {
      cleanup();
      return;
    }
    // @contract If in landscape, rotate to portrait first then fly-back
    if (isScreenLandscape && isLandscape) {
      waitingForPortrait.current = true;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
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
    if (isScreenLandscape && isLandscape) {
      waitingForPortrait.current = true;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      return;
    }
    animateClose(CLOSE_DURATION);
  }, [animateClose, animationsEnabled, cleanup, isScreenLandscape, isLandscape, closing]);
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
  // @sync Mask snaps: visible immediately on close, hidden immediately on open.
  const topChromeMaskStyle = useAnimatedStyle(() => ({
    opacity: closing.value === 1 ? 1 : backdropOpacity.value > 0 ? 0 : 1,
  }));

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
                onLoad={() => setFullResLoaded(true)}
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
