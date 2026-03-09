import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, StatusBar, BackHandler, TouchableOpacity, type View } from 'react-native';
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
import { overlayStyles as styles } from './ImageViewerOverlay.styles';
import { measureView } from '@/utils/measureView';
import type { ImageSourceLayout } from '@/providers/ImageViewerProvider';

export interface ImageViewerOverlayProps {
  feedUrl: string;
  fullUrl: string;
  sourceLayout: ImageSourceLayout;
  sourceRef: React.RefObject<View | null>;
  borderRadius: number;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const POSTER_ASPECT = 3 / 2; // 2:3 poster (height / width)
const OPEN_DURATION = 300;
const CLOSE_DURATION = 250;
const EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

export function ImageViewerOverlay({
  feedUrl,
  fullUrl,
  sourceLayout,
  sourceRef,
  borderRadius: srcRadius,
  onClose,
}: ImageViewerOverlayProps) {
  const progress = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const closingRef = useRef(false);

  // Shared values for source position — can be updated on close for scroll-aware fly-back
  const srcX = useSharedValue(sourceLayout.x);
  const srcY = useSharedValue(sourceLayout.y);
  const srcW = useSharedValue(sourceLayout.width);
  const srcH = useSharedValue(sourceLayout.height);

  // Target: poster centered on screen at full width
  const tgtW = SCREEN_W;
  const tgtH = SCREEN_W * POSTER_ASPECT;
  const tgtX = 0;
  const tgtY = (SCREEN_H - tgtH) / 2;

  // Animate open on mount
  useEffect(() => {
    progress.value = withTiming(1, { duration: OPEN_DURATION, easing: EASING });
    backdropOpacity.value = withTiming(1, { duration: OPEN_DURATION, easing: EASING });
  }, [progress, backdropOpacity]);

  const cleanup = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateClose = useCallback(
    (dur: number) => {
      progress.value = withTiming(0, { duration: dur, easing: EASING }, (finished) => {
        if (finished) runOnJS(cleanup)();
      });
      backdropOpacity.value = withTiming(0, { duration: dur, easing: EASING });
    },
    [progress, backdropOpacity, cleanup],
  );

  // Close button / back button: re-measure card, fly back
  const handleCloseButton = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

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

  // Swipe dismiss: fly back to card (gesture resets its transforms simultaneously)
  const handleSwipeDismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    animateClose(CLOSE_DURATION);
  }, [animateClose]);

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

  return (
    <Animated.View style={styles.root} pointerEvents="auto">
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={handleCloseButton}
        accessibilityLabel="Close image"
      >
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      <ImageViewerGestures onDismiss={handleSwipeDismiss} backdropOpacity={backdropOpacity}>
        <Animated.View style={[styles.gestureArea]}>
          <Animated.View style={animatedContainerStyle}>
            {/* Feed-quality image — already cached, shows instantly */}
            <Image source={{ uri: feedUrl }} style={styles.imageFill} contentFit="cover" />
            {/* Full-resolution crossfades in when loaded */}
            <Image
              source={{ uri: fullUrl }}
              style={styles.imageFill}
              contentFit="cover"
              transition={300}
            />
          </Animated.View>
        </Animated.View>
      </ImageViewerGestures>
    </Animated.View>
  );
}
