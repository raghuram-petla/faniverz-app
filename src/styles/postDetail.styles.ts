import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

export const createPostDetailStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: t.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surfaceElevated,
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
      color: t.textPrimary,
      marginLeft: 12,
    },
    scrollContent: {
      paddingBottom: 16,
    },
    commentsList: {
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    commentsHeader: {
      fontSize: 15,
      fontWeight: '700',
      color: t.textPrimary,
      marginBottom: 12,
    },
    // --- Comment item ---
    commentItem: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    commentItemNested: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
      marginLeft: 42,
    },
    commentAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    commentContent: {
      flex: 1,
    },
    commentName: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textPrimary,
    },
    commentTime: {
      fontSize: 11,
      color: t.textTertiary,
      marginLeft: 6,
    },
    commentBody: {
      fontSize: 14,
      color: t.textPrimary,
      marginTop: 2,
      lineHeight: 20,
    },
    mentionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.red600,
    },
    // --- Comment actions row (reply, like, delete) ---
    commentActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 16,
    },
    commentReplyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    commentReplyText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.textTertiary,
    },
    commentLikeButton: {
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 2,
      gap: 2,
    },
    commentLikeCount: {
      fontSize: 12,
      color: t.textTertiary,
    },
    commentDeleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    commentDeleteText: {
      fontSize: 12,
      color: colors.red500,
    },
    // --- View replies toggle ---
    viewRepliesButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 42,
      marginBottom: 12,
      gap: 8,
    },
    viewRepliesDash: {
      width: 24,
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.textTertiary,
    },
    viewRepliesText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.textTertiary,
    },
    // --- Empty state ---
    emptyComments: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyCommentsText: {
      fontSize: 14,
      color: t.textTertiary,
      marginTop: 8,
    },
    // --- Emoji quick-pick row (Instagram-style, edge-to-edge) ---
    emojiRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
      backgroundColor: t.background,
    },
    emojiButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiText: {
      fontSize: 24,
    },
    // --- Input avatar ---
    inputAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputAvatarImage: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    // --- Input bar (NO absolute positioning — flex layout for keyboard avoidance) ---
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: t.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
      gap: 8,
    },
    inputField: {
      flex: 1,
      minHeight: 36,
      maxHeight: 100,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: t.surfaceElevated,
      color: t.textPrimary,
      fontSize: 14,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.red600,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    loginPrompt: {
      flex: 1,
      paddingVertical: 10,
    },
    loginPromptText: {
      fontSize: 14,
      color: t.textTertiary,
    },
    loadMoreText: {
      color: colors.red600,
      textAlign: 'center',
      paddingVertical: 8,
    },
    // --- Reply indicator banner ---
    replyIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: t.surfaceElevated,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
    },
    replyIndicatorText: {
      fontSize: 12,
      color: t.textTertiary,
    },
    replyIndicatorCancel: {
      padding: 4,
    },
  });
