import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { CommentItem } from './CommentItem';
import { CommentReplies } from './CommentReplies';
import { createPostDetailStyles } from '@/styles/postDetail.styles';
import type { FeedComment } from '@shared/types';

export interface CommentsListProps {
  comments: FeedComment[];
  /** @nullable null when user is not authenticated — all comments show as non-owned */
  userId: string | null;
  likedCommentIds: Record<string, true>;
  isLoading: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  /** @sideeffect Fires delete mutation — caller handles optimistic update */
  onDelete?: (commentId: string, parentCommentId?: string | null) => void;
  onReply?: (comment: FeedComment) => void;
  onLike?: (commentId: string) => void;
  onUnlike?: (commentId: string) => void;
}

/** @contract three states: loading spinner, empty state, or comment list with replies + pagination */
export function CommentsList({
  comments,
  userId,
  likedCommentIds,
  isLoading,
  hasNextPage,
  onLoadMore,
  onDelete,
  onReply,
  onLike,
  onUnlike,
}: CommentsListProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createPostDetailStyles(theme);

  if (isLoading) {
    return (
      <View style={styles.emptyComments}>
        <ActivityIndicator size="small" color={colors.red600} />
      </View>
    );
  }

  if (comments.length === 0) {
    return (
      <View style={styles.emptyComments}>
        <Ionicons name="chatbubble-outline" size={32} color={colors.gray500} />
        <Text style={styles.emptyCommentsText}>{t('feed.noComments')}</Text>
      </View>
    );
  }

  return (
    <View>
      {comments.map((comment) => (
        <View key={comment.id}>
          <CommentItem
            comment={comment}
            isOwn={comment.user_id === userId}
            isLiked={!!likedCommentIds[comment.id]}
            onDelete={onDelete ? (id) => onDelete(id, null) : undefined}
            onReply={onReply}
            onLike={onLike ? () => onLike(comment.id) : undefined}
            onUnlike={onUnlike ? () => onUnlike(comment.id) : undefined}
          />
          {/** @edge reply_count is denormalized on the comment row — may drift if a reply was deleted without updating the parent count */}
          {comment.reply_count > 0 ? (
            <CommentReplies
              parentComment={comment}
              userId={userId}
              onReply={onReply ?? /* istanbul ignore next */ (() => {})}
              onLike={onLike ?? /* istanbul ignore next */ (() => {})}
              onUnlike={onUnlike ?? /* istanbul ignore next */ (() => {})}
              onDelete={onDelete ? (id, parentId) => onDelete(id, parentId) : /* istanbul ignore next */ () => {}}
            />
          ) : null}
        </View>
      ))}
      {hasNextPage && onLoadMore ? (
        <TouchableOpacity onPress={onLoadMore} accessibilityLabel="Load more comments">
          <Text style={styles.loadMoreText}>{t('feed.loadMore')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
