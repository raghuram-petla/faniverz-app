import { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useComments, useAddComment, useDeleteComment } from '@/features/feed';
import { CommentsList } from './CommentsList';
import { CommentInput } from './CommentInput';
import { createCommentsSheetStyles } from '@/styles/commentsBottomSheet.styles';

/**
 * @contract Draggable bottom sheet for comments. Snaps to 35%, 65%, and full screen (minus safe area).
 * @coupling useComments/useAddComment/useDeleteComment — same hooks used by PostDetailScreen.
 * @sideeffect Dragging below the smallest snap point dismisses the sheet.
 */
export interface CommentsBottomSheetProps {
  visible: boolean;
  feedItemId: string;
  onClose: () => void;
}

const SCREEN_H = Dimensions.get('window').height;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 };

export function CommentsBottomSheet({ visible, feedItemId, onClose }: CommentsBottomSheetProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createCommentsSheetStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const { user } = useAuth();

  // @invariant Snap points: small (35%), medium (65%), large (full screen minus safe area top)
  const SNAP_SMALL = SCREEN_H * 0.35;
  const SNAP_MEDIUM = SCREEN_H * 0.65;
  const SNAP_LARGE = useMemo(() => SCREEN_H - insets.top, [insets.top]);

  const { data: commentsData, isLoading, hasNextPage, fetchNextPage } = useComments(feedItemId);
  const addMutation = useAddComment(feedItemId);
  const deleteMutation = useDeleteComment(feedItemId);

  /** @nullable commentsData can be undefined before first fetch completes */
  const comments = useMemo(
    () => commentsData?.pages.flatMap((page) => page) ?? [],
    [commentsData?.pages],
  );

  // @sync sheetHeight is the animated height driven by pan gesture + snap
  const sheetHeight = useSharedValue(SNAP_MEDIUM);
  const startHeight = useSharedValue(SNAP_MEDIUM);

  // @contract Height stays at 0 after close — useEffect resets it on next open
  const dismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  /** @sideeffect Animates sheet to 0 height, then calls dismiss */
  const animateClose = useCallback(() => {
    sheetHeight.value = withSpring(0, SPRING_CONFIG, () => runOnJS(dismiss)());
  }, [sheetHeight, dismiss]);

  /** @contract Finds nearest snap point, or dismisses if dragged below minimum threshold */
  const snapToNearest = useCallback(
    (h: number) => {
      const snaps = [SNAP_SMALL, SNAP_MEDIUM, SNAP_LARGE];
      const dismissThreshold = SNAP_SMALL * 0.5;

      if (h < dismissThreshold) {
        sheetHeight.value = withSpring(0, SPRING_CONFIG, () => runOnJS(dismiss)());
        return;
      }

      let closest = snaps[0];
      let minDist = Math.abs(h - snaps[0]);
      for (let i = 1; i < snaps.length; i++) {
        const dist = Math.abs(h - snaps[i]);
        if (dist < minDist) {
          minDist = dist;
          closest = snaps[i];
        }
      }
      sheetHeight.value = withSpring(closest, SPRING_CONFIG);
    },
    [sheetHeight, dismiss, SNAP_SMALL, SNAP_MEDIUM, SNAP_LARGE],
  );

  // @sideeffect Pan gesture on drag handle resizes the sheet vertically
  // @edge Fast downward swipe (velocityY > 1500) dismisses regardless of position
  const FLING_VELOCITY = 1500;
  const panGesture = Gesture.Pan()
    .onStart(() => {
      startHeight.value = sheetHeight.value;
    })
    .onUpdate((e) => {
      // Dragging up = negative translationY = increase height
      const newH = startHeight.value - e.translationY;
      const clamped = Math.max(0, Math.min(newH, SNAP_LARGE));
      sheetHeight.value = clamped;
    })
    .onEnd((e) => {
      if (e.velocityY > FLING_VELOCITY) {
        sheetHeight.value = withSpring(0, SPRING_CONFIG, () => runOnJS(dismiss)());
      } else if (e.velocityY < -FLING_VELOCITY) {
        sheetHeight.value = withSpring(SNAP_LARGE, SPRING_CONFIG);
      } else {
        runOnJS(snapToNearest)(sheetHeight.value);
      }
    });

  // @edge Border radius fades to 0 as sheet approaches full height
  const animatedSheetStyle = useAnimatedStyle(() => {
    const radiusThreshold = SNAP_LARGE - 30;
    const progress =
      sheetHeight.value > radiusThreshold ? (sheetHeight.value - radiusThreshold) / 30 : 0;
    const radius = 20 * (1 - Math.min(progress, 1));
    return {
      height: sheetHeight.value,
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
    };
  });

  // @sideeffect Reset height when sheet opens
  useEffect(() => {
    if (visible) {
      sheetHeight.value = withSpring(SNAP_MEDIUM, SPRING_CONFIG);
    }
  }, [visible, sheetHeight, SNAP_MEDIUM]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={animateClose}
      testID="comments-bottom-sheet"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.overlay}
          onPress={animateClose}
          accessibilityLabel="Close comments"
        >
          <Animated.View style={[styles.sheet, animatedSheetStyle]}>
            <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
              <GestureDetector gesture={panGesture}>
                <View style={styles.dragZone}>
                  <View style={styles.dragHandle} />
                </View>
              </GestureDetector>

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <CommentsList
                  comments={comments}
                  userId={user?.id ?? null}
                  isLoading={isLoading}
                  hasNextPage={hasNextPage}
                  onLoadMore={() => fetchNextPage()}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              </ScrollView>

              <CommentInput
                isAuthenticated={!!user}
                onSubmit={(body) => addMutation.mutate(body)}
                bottomInset={insets.bottom}
              />
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
