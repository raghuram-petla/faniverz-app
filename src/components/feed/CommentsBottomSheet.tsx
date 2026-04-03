import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Modal, Pressable, KeyboardAvoidingView, Platform, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import {
  useComments,
  useAddComment,
  useDeleteComment,
  useUserCommentLikes,
  useLikeComment,
  useUnlikeComment,
} from '@/features/feed';
import { CommentsList } from './CommentsList';
import { CommentInput, type ReplyTarget } from './CommentInput';
import { createCommentsSheetStyles } from '@/styles/commentsBottomSheet.styles';
import type { FeedComment } from '@shared/types';

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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createCommentsSheetStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // @invariant Snap points: small (35%), medium (65%), large (full screen minus safe area top)
  const SNAP_SMALL = SCREEN_H * 0.35;
  const SNAP_MEDIUM = SCREEN_H * 0.65;
  const SNAP_LARGE = useMemo(() => SCREEN_H - insets.top, [insets.top]);

  // --- Data hooks ---
  const { data: commentsData, isLoading, hasNextPage, fetchNextPage } = useComments(feedItemId);
  const addMutation = useAddComment(feedItemId);
  const deleteMutation = useDeleteComment(feedItemId);

  const comments = useMemo(
    () => commentsData?.pages.flatMap((page) => page) ?? [],
    [commentsData?.pages],
  );

  // @contract: collect all visible comment IDs for likes query
  const commentIds = useMemo(() => comments.map((c) => c.id), [comments]);
  const { data: likedCommentIds = {} } = useUserCommentLikes(commentIds);
  const likeMutation = useLikeComment(feedItemId);
  const unlikeMutation = useUnlikeComment(feedItemId);

  // --- Reply state ---
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  /** @contract Resolve parentCommentId: if replying to nested, use its parent; if top-level, use its id */
  const handleReply = useCallback((comment: FeedComment) => {
    const parentId = comment.parent_comment_id ?? comment.id;
    setReplyTarget({
      commentId: comment.id,
      parentCommentId: parentId,
      displayName: comment.profile?.display_name ?? t('feed.anonymous'),
    });
  }, [t]);

  // --- Animation shared values ---
  const sheetHeight = useSharedValue(SNAP_MEDIUM);
  const startHeight = useSharedValue(SNAP_MEDIUM);

  const dismiss = useCallback(() => { onClose(); }, [onClose]);

  const animateClose = useCallback(() => {
    sheetHeight.value = withSpring(0, SPRING_CONFIG, () => runOnJS(dismiss)());
  }, [sheetHeight, dismiss]);

  const snapToNearest = useCallback(
    /* istanbul ignore next */
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
        if (dist < minDist) { minDist = dist; closest = snaps[i]; }
      }
      sheetHeight.value = withSpring(closest, SPRING_CONFIG);
    },
    [sheetHeight, dismiss, SNAP_SMALL, SNAP_MEDIUM, SNAP_LARGE],
  );

  const scrollOffset = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: /* istanbul ignore next */ (e) => { scrollOffset.value = e.contentOffset.y; },
  });

  const FLING_VELOCITY = 1500;
  const panGesture = Gesture.Pan()
    .onStart(/* istanbul ignore next */ () => { startHeight.value = sheetHeight.value; })
    .onUpdate(/* istanbul ignore next */ (e) => {
      const isDraggingDown = e.translationY > 0;
      if (isDraggingDown && scrollOffset.value > 1) return;
      const newH = startHeight.value - e.translationY;
      sheetHeight.value = Math.max(0, Math.min(newH, SNAP_LARGE));
    })
    .onEnd(/* istanbul ignore next */ (e) => {
      if (e.velocityY > FLING_VELOCITY && scrollOffset.value <= 1) {
        sheetHeight.value = withSpring(0, SPRING_CONFIG, () => runOnJS(dismiss)());
      } else if (e.velocityY < -FLING_VELOCITY) {
        sheetHeight.value = withSpring(SNAP_LARGE, SPRING_CONFIG);
      } else {
        runOnJS(snapToNearest)(sheetHeight.value);
      }
    })
    .activeOffsetY([-10, 10]);

  const nativeScrollGesture = Gesture.Native();
  const composedGesture = Gesture.Simultaneous(panGesture, nativeScrollGesture);

  const animatedSheetStyle = useAnimatedStyle(/* istanbul ignore next */ () => {
    const radiusThreshold = SNAP_LARGE - 30;
    const progress =
      sheetHeight.value > radiusThreshold ? (sheetHeight.value - radiusThreshold) / 30 : 0;
    const radius = 20 * (1 - Math.min(progress, 1));
    return { height: sheetHeight.value, borderTopLeftRadius: radius, borderTopRightRadius: radius };
  });

  useEffect(() => {
    if (visible) {
      sheetHeight.value = withSpring(SNAP_MEDIUM, SPRING_CONFIG);
      setReplyTarget(null);
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
        <Pressable style={styles.overlay} onPress={animateClose} accessibilityLabel="Close comments">
          <Animated.View style={[styles.sheet, animatedSheetStyle]}>
            <Pressable
              onPress={/* istanbul ignore next */ (e) => e.stopPropagation()}
              style={{ flex: 1 }}
              testID="sheet-content-area"
            >
              <GestureDetector gesture={composedGesture}>
                <View style={{ flex: 1 }}>
                  <View style={styles.dragZone}>
                    <View style={styles.dragHandle} />
                  </View>

                  <Animated.ScrollView
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <GestureDetector gesture={nativeScrollGesture}>
                      <Animated.View>
                        <CommentsList
                          comments={comments}
                          userId={user?.id ?? null}
                          likedCommentIds={likedCommentIds}
                          isLoading={isLoading}
                          hasNextPage={hasNextPage}
                          onLoadMore={() => fetchNextPage()}
                          onDelete={(id, parentId) =>
                            deleteMutation.mutate(
                              { commentId: id, parentCommentId: parentId },
                              { onError: () => Alert.alert(t('common.error'), t('common.failedToDeleteComment')) },
                            )
                          }
                          onReply={handleReply}
                          onLike={(id) => likeMutation.mutate({ commentId: id })}
                          onUnlike={(id) => unlikeMutation.mutate({ commentId: id })}
                        />
                      </Animated.View>
                    </GestureDetector>
                  </Animated.ScrollView>
                </View>
              </GestureDetector>

              <CommentInput
                isAuthenticated={!!user}
                onSubmit={(body, parentCommentId) =>
                  addMutation.mutate(
                    { body, parentCommentId },
                    { onError: () => Alert.alert(t('common.error'), t('common.failedToAddComment')) },
                  )
                }
                bottomInset={insets.bottom}
                replyTarget={replyTarget}
                onCancelReply={() => setReplyTarget(null)}
              />
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
