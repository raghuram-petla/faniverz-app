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
      paddingBottom: 80,
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
    commentItem: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    commentAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
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
      color: t.textSecondary,
      marginTop: 2,
      lineHeight: 20,
    },
    commentDeleteBtn: {
      marginTop: 4,
    },
    commentDeleteText: {
      fontSize: 12,
      color: colors.red500,
    },
    emptyComments: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyCommentsText: {
      fontSize: 14,
      color: t.textTertiary,
      marginTop: 8,
    },
    inputBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
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
  });
