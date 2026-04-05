import { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { createPostDetailStyles } from '@/styles/postDetail.styles';

/** @contract Reply target identifies who we're replying to and under which parent. */
export interface ReplyTarget {
  /** The comment being replied to (used for @mention) */
  commentId: string;
  /** Always the top-level parent ID (for DB storage) */
  parentCommentId: string;
  /** Display name of the person being replied to */
  displayName: string;
}

// @contract Emoji quick-picks shown above the input bar (matches Instagram's comment UX)
const EMOJI_QUICK_PICKS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

/** @contract Shows emoji quick-picks, user avatar, and text input with optional reply indicator. */
export interface CommentInputProps {
  isAuthenticated: boolean;
  onSubmit: (body: string, parentCommentId?: string) => void;
  onLoginPress?: () => void;
  /** @coupling Must include safe area bottom inset to avoid keyboard overlap */
  bottomInset?: number;
  replyTarget?: ReplyTarget | null;
  onCancelReply?: () => void;
  /** @nullable Current user's avatar URL — shows placeholder icon when absent */
  avatarUrl?: string | null;
}

export function CommentInput({
  isAuthenticated,
  onSubmit,
  onLoginPress,
  bottomInset = 0,
  replyTarget,
  onCancelReply,
  avatarUrl,
}: CommentInputProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createPostDetailStyles(theme);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const trimmed = text.trim();

  // @contract: reserve space for @[displayName] prefix so total body stays within 500-char DB limit
  const mentionPrefixLen = replyTarget ? `@[${replyTarget.displayName}] `.length : 0;
  const maxBodyLength = 500 - mentionPrefixLen;

  // @sideeffect: auto-focus input when a reply target is set
  useEffect(() => {
    if (replyTarget) {
      inputRef.current?.focus();
    }
  }, [replyTarget]);

  /** @sideeffect clears input after submit; prepends @mention for replies */
  const handleSend = () => {
    /* istanbul ignore next -- send button is disabled={!trimmed}, so this guard is unreachable via UI */
    if (!trimmed) return;
    // @contract: wrap mention in brackets to handle display names with spaces
    const body = replyTarget ? `@[${replyTarget.displayName}] ${trimmed}` : trimmed;
    onSubmit(body, replyTarget?.parentCommentId);
    setText('');
    onCancelReply?.();
    inputRef.current?.blur();
  };

  /** @sideeffect Appends emoji to current text */
  const handleEmojiPress = (emoji: string) => {
    if (text.length + emoji.length <= maxBodyLength) {
      setText((prev) => prev + emoji);
    }
  };

  return (
    <View>
      {/* Reply indicator banner */}
      {replyTarget ? (
        <View style={styles.replyIndicator}>
          <Text style={styles.replyIndicatorText}>
            {t('feed.replyingTo', { name: replyTarget.displayName })}
          </Text>
          <TouchableOpacity
            style={styles.replyIndicatorCancel}
            onPress={onCancelReply}
            accessibilityLabel="Cancel reply"
          >
            <Ionicons name="close" size={16} color={colors.gray500} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* @contract Emoji quick-pick row — Instagram-style shortcuts above input */}
      {isAuthenticated ? (
        <View style={styles.emojiRow}>
          {EMOJI_QUICK_PICKS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleEmojiPress(emoji)}
              style={styles.emojiButton}
              accessibilityLabel={`Add ${emoji}`}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={[styles.inputBar, { paddingBottom: 8 + bottomInset }]}>
        {isAuthenticated ? (
          <>
            {/* @contract User avatar next to input — Instagram-style */}
            <View style={styles.inputAvatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.inputAvatarImage} />
              ) : (
                <Ionicons name="person-circle" size={28} color={colors.gray500} />
              )}
            </View>

            <TextInput
              ref={inputRef}
              style={styles.inputField}
              placeholder={
                replyTarget
                  ? t('feed.replyingTo', { name: replyTarget.displayName })
                  : t('feed.addComment')
              }
              placeholderTextColor={colors.gray500}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={maxBodyLength}
              accessibilityLabel="Comment input"
            />
            <TouchableOpacity
              style={[styles.sendButton, !trimmed && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!trimmed}
              accessibilityLabel="Send comment"
            >
              <Ionicons name="send" size={16} color={colors.white} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.loginPrompt} onPress={onLoginPress}>
            <Text style={styles.loginPromptText}>{t('auth.signInToComment')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
