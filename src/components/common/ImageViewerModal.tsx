import { useCallback } from 'react';
import { Modal, View, StyleSheet, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDecay,
  runOnJS,
} from 'react-native-reanimated';

export interface ImageViewerModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

const MAX_SCALE = 4;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Image is contained in SCREEN_W × SCREEN_H with contentFit="contain".
// For a portrait image the limiting dimension is width, so the rendered
// image height = SCREEN_W * (imageH/imageW).  We don't know the exact
// aspect ratio, so we assume a 2:3 poster (most common case).
const IMG_W = SCREEN_W;
const IMG_H = SCREEN_W * 1.5; // 2:3 poster rendered height
// Extra vertical overscroll so users can pan past notch / Dynamic Island / curved edges
const Y_OVERSCROLL = 150;

function clampX(x: number, s: number): number {
  'worklet';
  const maxX = Math.max(0, (IMG_W * s - SCREEN_W) / 2);
  return Math.min(maxX, Math.max(-maxX, x));
}

function clampY(y: number, s: number): number {
  'worklet';
  const maxY = Math.max(0, (IMG_H * s - SCREEN_H) / 2) + Y_OVERSCROLL;
  return Math.min(maxY, Math.max(-maxY, y));
}

export function ImageViewerModal({ imageUrl, onClose }: ImageViewerModalProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetTransforms = useCallback(() => {
    'worklet';
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, translateX, translateY, savedScale, savedTranslateX, savedTranslateY]);

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

  const pan = Gesture.Pan()
    .minPointers(1)
    .onStart(() => {
      // Sync saved values to current position (may have changed via withDecay)
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = clampX(savedTranslateX.value + e.translationX, scale.value);
        translateY.value = clampY(savedTranslateY.value + e.translationY, scale.value);
      } else {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (scale.value <= 1) {
        if (Math.abs(e.translationY) > 100) {
          runOnJS(onClose)();
        }
        translateY.value = withTiming(0);
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

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        resetTransforms();
      } else {
        scale.value = withTiming(MAX_SCALE);
        savedScale.value = MAX_SCALE;
      }
    });

  const gesture = Gesture.Simultaneous(pinch, Gesture.Race(doubleTap, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleClose = useCallback(() => {
    resetTransforms();
    onClose();
  }, [resetTransforms, onClose]);

  if (!imageUrl) return null;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            accessibilityLabel="Close image"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.imageWrapper, animatedStyle]}>
              <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" />
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
