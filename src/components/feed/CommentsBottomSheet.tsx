import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
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
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { CommentsList } from './CommentsList';
import { CommentInput, type ReplyTarget } from './CommentInput';
import { createCommentsSheetStyles } from '@/styles/commentsBottomSheet.styles';
import type { FeedComment } from '@shared/types';

/**
 * @contract Draggable bottom sheet for comments. Snaps to small (40%) and large (full screen minus safe area).
 * @coupling useComments/useAddComment/useDeleteComment — same hooks used by PostDetailScreen.
 * @sideeffect Dragging below the smallest snap point dismisses the sheet.
 * @sideeffect Auto-expands to large when keyboard opens; keyboard height offsets the input bar.
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
  const { data: profile } = useProfile();
  const keyboardHeight = useKeyboardHeight();

  // @invariant Snap points: small (60%) and large (full screen minus safe area top)
  const SNAP_SMALL = SCREEN_H * 0.6;
  const SNAP_LARGE = useMemo(() => SCREEN_H - insets.top, [insets.top]);

  // @coupling These hooks share the same ['comments', feedItemId] query key — addMutation/deleteMutation invalidate it after success.
  const { data: commentsData, isLoading, hasNextPage, fetchNextPage } = useComments(feedItemId);
  const addMutation = useAddComment(feedItemId);
  const deleteMutation = useDeleteComment(feedItemId);

  // @contract: user's own comments float to top, then newest-first order from API
  const comments = useMemo(() => {
    const all = commentsData?.pages.flatMap((page) => page) ?? [];
    if (!user?.id) return all;
    const own = all.filter((c) => c.user_id === user.id);
    const others = all.filter((c) => c.user_id !== user.id);
    return [...own, ...others];
  }, [commentsData?.pages, user?.id]);

  // @contract: collect all visible comment IDs for likes query
  const commentIds = useMemo(() => comments.map((c) => c.id), [comments]);
  const { data: likedCommentIds = /* istanbul ignore next */ {} } = useUserCommentLikes(commentIds);
  const likeMutation = useLikeComment(feedItemId);
  const unlikeMutation = useUnlikeComment(feedItemId);

  // --- Reply state ---
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const commentPositions = useRef<Record<string, number>>({});

  /** @contract Track each comment's Y position within the ScrollView for scroll-to-reply */
  const handleCommentLayout = useCallback((commentId: string, y: number) => {
    commentPositions.current[commentId] = y;
  }, []);

  /** @contract Resolve parentCommentId: if replying to nested, use its parent; if top-level, use its id */
  const handleReply = useCallback(
    (comment: FeedComment) => {
      const parentId = comment.parent_comment_id ?? comment.id;
      setReplyTarget({
        commentId: comment.id,
        parentCommentId: parentId,
        displayName:
          comment.profile?.display_name ?? /* istanbul ignore next */ t('feed.anonymous'),
      });
      // @sideeffect Scroll to the comment being replied to so it stays visible above the keyboard
      const y = commentPositions.current[comment.id];
      if (y != null) {
        setTimeout(
          /* istanbul ignore next */ () => scrollViewRef.current?.scrollTo({ y, animated: true }),
          100,
        );
      }
    },
    [t],
  );

  // --- Animation shared values ---
  const sheetHeight = useSharedValue(SNAP_SMALL);
  const startHeight = useSharedValue(SNAP_SMALL);
  // @sync Mirror keyboardHeight into a shared value so the pan gesture worklet can read it
  const isKeyboardOpen = useSharedValue(false);
  useEffect(() => {
    isKeyboardOpen.value = keyboardHeight > 0;
  }, [keyboardHeight, isKeyboardOpen]);

  const dismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const dismissKeyboard = useCallback(
    /* istanbul ignore next */ () => {
      Keyboard.dismiss();
    },
    [],
  );

  const animateClose = useCallback(() => {
    sheetHeight.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }, () =>
      runOnJS(dismiss)(),
    );
  }, [sheetHeight, dismiss]);

  const snapToNearest = useCallback(
    /* istanbul ignore next */
    (h: number) => {
      const snaps = [SNAP_SMALL, SNAP_LARGE];
      const dismissThreshold = SNAP_SMALL * 0.5;
      if (h < dismissThreshold) {
        sheetHeight.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }, () =>
          runOnJS(dismiss)(),
        );
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
    [sheetHeight, dismiss, SNAP_SMALL, SNAP_LARGE],
  );

  // @invariant Pan gesture is confined to the header panel only — not the scroll area.
  // @edge Swipe down from SNAP_LARGE → SNAP_SMALL. Swipe down from SNAP_SMALL → dismiss.
  // @edge Any upward swipe expands to SNAP_LARGE.
  const panGesture = Gesture.Pan()
    .onStart(
      /* istanbul ignore next */ () => {
        startHeight.value = sheetHeight.value;
        if (isKeyboardOpen.value) {
          runOnJS(dismissKeyboard)();
        }
      },
    )
    .onUpdate(
      /* istanbul ignore next */ (e) => {
        const newH = startHeight.value - e.translationY;
        sheetHeight.value = Math.max(0, Math.min(newH, SNAP_LARGE));
      },
    )
    .onEnd(
      /* istanbul ignore next */ (e) => {
        const SWIPE_THRESHOLD = 30;
        const FLING_VELOCITY = 3000;
        if (e.translationY < -SWIPE_THRESHOLD) {
          // Any upward swipe expands to full screen
          sheetHeight.value = withSpring(SNAP_LARGE, SPRING_CONFIG);
        } else if (e.velocityY > FLING_VELOCITY) {
          // Force fling down: dismiss keyboard if open, then close the sheet
          if (isKeyboardOpen.value) {
            runOnJS(dismissKeyboard)();
          }
          sheetHeight.value = withTiming(
            0,
            { duration: 400, easing: Easing.out(Easing.cubic) },
            () => runOnJS(dismiss)(),
          );
        } else if (e.translationY > SWIPE_THRESHOLD) {
          // Gentle swipe down: step down one level (large → small, small → dismiss)
          const wasAtLarge = startHeight.value > (SNAP_SMALL + SNAP_LARGE) / 2;
          if (wasAtLarge) {
            sheetHeight.value = withSpring(SNAP_SMALL, SPRING_CONFIG);
          } else {
            sheetHeight.value = withTiming(
              0,
              { duration: 400, easing: Easing.out(Easing.cubic) },
              () => runOnJS(dismiss)(),
            );
          }
        } else {
          // Micro-drag — snap back to where it started
          runOnJS(snapToNearest)(sheetHeight.value);
        }
      },
    )
    .activeOffsetY([-10, 10]);

  const animatedSheetStyle = useAnimatedStyle(
    /* istanbul ignore next */ () => {
      const radiusThreshold = SNAP_LARGE - 30;
      const progress =
        sheetHeight.value > radiusThreshold ? (sheetHeight.value - radiusThreshold) / 30 : 0;
      const radius = 20 * (1 - Math.min(progress, 1));
      return {
        height: sheetHeight.value,
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
      };
    },
  );

  // @sideeffect Open at small snap; reset reply state
  useEffect(() => {
    if (visible) {
      sheetHeight.value = withSpring(SNAP_SMALL, SPRING_CONFIG);
      setReplyTarget(null);
    }
  }, [visible, sheetHeight, SNAP_SMALL]);

  // @sideeffect Auto-expand to large when keyboard opens so input stays visible
  useEffect(() => {
    if (keyboardHeight > 0 && visible) {
      sheetHeight.value = withSpring(SNAP_LARGE, SPRING_CONFIG);
    }
  }, [keyboardHeight, visible, sheetHeight, SNAP_LARGE]);

  // @contract Compute bottom inset: when keyboard is visible, use keyboard height; otherwise use safe area
  const inputBottomInset = keyboardHeight > 0 ? keyboardHeight : insets.bottom;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={animateClose}
      testID="comments-bottom-sheet"
    >
      <View style={styles.overlay}>
        {/* @contract Backdrop sits behind the sheet; tapping it dismisses */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={animateClose}
          accessibilityLabel="Close comments"
        />

        <Animated.View style={[styles.sheet, animatedSheetStyle]} testID="sheet-content-area">
          <View style={{ flex: 1 }}>
            {/* @contract Header panel: drag handle + "Comments" title. Swiping here resizes the sheet. */}
            <GestureDetector gesture={panGesture}>
              <View style={styles.headerPanel}>
                <View style={styles.dragHandle} />
                <Text style={styles.headerTitle}>{t('postDetail.comments')}</Text>
              </View>
            </GestureDetector>

            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onTouchStart={() => Keyboard.dismiss()}
            >
              <CommentsList
                comments={comments}
                userId={user?.id ?? null}
                likedCommentIds={likedCommentIds}
                isLoading={isLoading}
                hasNextPage={hasNextPage}
                onLoadMore={() => fetchNextPage()}
                onCommentLayout={handleCommentLayout}
                onDelete={(id, parentId) =>
                  deleteMutation.mutate(
                    { commentId: id, parentCommentId: parentId },
                    {
                      onError: () =>
                        Alert.alert(t('common.error'), t('common.failedToDeleteComment')),
                    },
                  )
                }
                onReply={handleReply}
                onLike={(id) => likeMutation.mutate({ commentId: id })}
                onUnlike={(id) => unlikeMutation.mutate({ commentId: id })}
              />
            </ScrollView>
          </View>

          <CommentInput
            isAuthenticated={!!user}
            onSubmit={(body, parentCommentId) =>
              addMutation.mutate(
                { body, parentCommentId },
                { onError: () => Alert.alert(t('common.error'), t('common.failedToAddComment')) },
              )
            }
            bottomInset={inputBottomInset}
            replyTarget={replyTarget}
            onCancelReply={() => setReplyTarget(null)}
            avatarUrl={profile?.avatar_url}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}
