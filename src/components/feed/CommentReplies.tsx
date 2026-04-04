import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { useReplies, useUserCommentLikes } from '@/features/feed';
import { CommentItem } from './CommentItem';
import { createPostDetailStyles } from '@/styles/postDetail.styles';
import type { FeedComment } from '@shared/types';

/** @contract Renders "View N replies" toggle + indented reply list for a top-level comment. */
export interface CommentRepliesProps {
  parentComment: FeedComment;
  userId: string | null;
  onReply: (comment: FeedComment) => void;
  onLike: (commentId: string) => void;
  onUnlike: (commentId: string) => void;
  onDelete: (commentId: string, parentCommentId: string) => void;
}

export function CommentReplies({
  parentComment,
  userId,
  onReply,
  onLike,
  onUnlike,
  onDelete,
}: CommentRepliesProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createPostDetailStyles(theme);
  const [expanded, setExpanded] = useState(false);

  // @contract: only fetch when expanded — avoids unnecessary requests for collapsed threads
  // @coupling useReplies passes empty string as parentId when collapsed; the hook must treat '' as disabled query.
  const { data: replies, isLoading } = useReplies(expanded ? parentComment.id : '');

  // @contract: fetch like status for reply IDs independently (top-level likes query doesn't include replies)
  // @edge replyIds updates after replies load, which triggers a second render with the likes query — brief "unliked" flash is possible
  const replyIds = useMemo(() => (replies ?? []).map((r) => r.id), [replies]);
  const { data: replyLikes = {} } = useUserCommentLikes(replyIds);

  if (parentComment.reply_count === 0) return null;

  // @edge: toggle label changes based on count (singular vs plural)
  const toggleLabel = expanded
    ? t('feed.hideReplies')
    : parentComment.reply_count === 1
      ? t('feed.viewReply')
      : t('feed.viewReplies', { count: parentComment.reply_count });

  return (
    <View>
      <TouchableOpacity
        style={styles.viewRepliesButton}
        onPress={() => setExpanded(!expanded)}
        accessibilityLabel={toggleLabel}
      >
        <View style={styles.viewRepliesDash} />
        <Text style={styles.viewRepliesText}>{toggleLabel}</Text>
        {isLoading ? <ActivityIndicator size="small" color={colors.red600} /> : null}
      </TouchableOpacity>

      {expanded && replies
        ? replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isOwn={reply.user_id === userId}
              isLiked={!!replyLikes[reply.id]}
              isNested
              onReply={onReply}
              onLike={() => onLike(reply.id)}
              onUnlike={() => onUnlike(reply.id)}
              onDelete={() => onDelete(reply.id, parentComment.id)}
            />
          ))
        : null}
    </View>
  );
}
