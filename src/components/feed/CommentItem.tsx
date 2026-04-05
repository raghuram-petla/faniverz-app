import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { createPostDetailStyles } from '@/styles/postDetail.styles';
import type { FeedComment } from '@shared/types';

/** @contract Renders a single comment with avatar, body, actions (reply, like, delete). */
export interface CommentItemProps {
  comment: FeedComment;
  isOwn: boolean;
  isLiked: boolean;
  /** @assumes true for replies (indented, smaller avatar area) */
  isNested?: boolean;
  onDelete?: (commentId: string) => void;
  onReply?: (comment: FeedComment) => void;
  onLike?: () => void;
  onUnlike?: () => void;
}

export function CommentItem({
  comment,
  isOwn,
  isLiked,
  isNested = false,
  onDelete,
  onReply,
  onLike,
  onUnlike,
}: CommentItemProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createPostDetailStyles(theme);
  const relativeTime = useRelativeTime(comment.created_at);

  /** @nullable profile may be null for deleted users; falls back to 'anonymous' */
  const displayName = comment.profile?.display_name ?? t('feed.anonymous');
  const avatarUrl = comment.profile?.avatar_url;

  // @edge: parse @[Name] mention at start of body for replies (brackets handle spaces in names)
  // @coupling This regex must match the format produced by CommentInput.handleSend: `@[${displayName}] ${body}`
  const mentionMatch = isNested ? comment.body.match(/^@\[([^\]]+)\]\s?/) : null;
  const mentionName = mentionMatch ? mentionMatch[1] : null;
  const bodyAfterMention = mentionName ? comment.body.slice(mentionMatch![0].length) : comment.body;

  return (
    <View style={isNested ? styles.commentItemNested : styles.commentItem}>
      <View style={styles.commentAvatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person-circle" size={24} color={colors.gray500} />
        )}
      </View>
      <View style={styles.commentContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.commentName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.commentTime}>{relativeTime}</Text>
        </View>

        {/* @edge Render @mention in accent color, rest of body normally */}
        <Text style={styles.commentBody} numberOfLines={8}>
          {mentionName ? (
            <>
              <Text style={styles.mentionText}>@{mentionName} </Text>
              {bodyAfterMention}
            </>
          ) : (
            comment.body
          )}
        </Text>

        {/* Actions row: Reply, Delete */}
        <View style={styles.commentActionsRow}>
          {onReply ? (
            <TouchableOpacity
              style={styles.commentReplyButton}
              onPress={() => onReply(comment)}
              accessibilityLabel="Reply to comment"
            >
              <Text style={styles.commentReplyText}>{t('feed.reply')}</Text>
            </TouchableOpacity>
          ) : null}

          {isOwn && onDelete ? (
            <TouchableOpacity
              style={styles.commentDeleteBtn}
              onPress={() => onDelete(comment.id)}
              accessibilityLabel="Delete comment"
            >
              <Text style={styles.commentDeleteText}>{t('common.delete')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* @contract Like button pinned to the right edge of the comment row */}
      <TouchableOpacity
        style={styles.commentLikeButton}
        onPress={isLiked ? onUnlike : onLike}
        accessibilityLabel={isLiked ? 'Unlike comment' : 'Like comment'}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={20}
          color={isLiked ? colors.red600 : colors.gray500}
        />
        {comment.like_count > 0 ? (
          <Text style={styles.commentLikeCount}>{comment.like_count}</Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}
