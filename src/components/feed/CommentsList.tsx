import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { CommentItem } from './CommentItem';
import { createPostDetailStyles } from '@/styles/postDetail.styles';
import type { FeedComment } from '@shared/types';

export interface CommentsListProps {
  comments: FeedComment[];
  userId: string | null;
  isLoading: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onDelete?: (commentId: string) => void;
}

export function CommentsList({
  comments,
  userId,
  isLoading,
  hasNextPage,
  onLoadMore,
  onDelete,
}: CommentsListProps) {
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
        <Text style={styles.emptyCommentsText}>No comments yet. Be the first!</Text>
      </View>
    );
  }

  return (
    <View>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          isOwn={comment.user_id === userId}
          onDelete={onDelete}
        />
      ))}
      {hasNextPage && onLoadMore ? (
        <TouchableOpacity onPress={onLoadMore} accessibilityLabel="Load more comments">
          <Text style={{ color: colors.red600, textAlign: 'center', paddingVertical: 8 }}>
            Load more
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
