import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { formatRelativeTime } from '@/constants/feedHelpers';
import { createPostDetailStyles } from '@/styles/postDetail.styles';
import type { FeedComment } from '@shared/types';

export interface CommentItemProps {
  comment: FeedComment;
  isOwn: boolean;
  onDelete?: (commentId: string) => void;
}

export function CommentItem({ comment, isOwn, onDelete }: CommentItemProps) {
  const { theme, colors } = useTheme();
  const styles = createPostDetailStyles(theme);
  const displayName = comment.profile?.display_name ?? 'Anonymous';

  return (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <Ionicons name="person-circle" size={24} color={colors.gray500} />
      </View>
      <View style={styles.commentContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.commentName}>{displayName}</Text>
          <Text style={styles.commentTime}>{formatRelativeTime(comment.created_at)}</Text>
        </View>
        <Text style={styles.commentBody}>{comment.body}</Text>
        {isOwn && onDelete ? (
          <TouchableOpacity
            style={styles.commentDeleteBtn}
            onPress={() => onDelete(comment.id)}
            accessibilityLabel="Delete comment"
          >
            <Text style={styles.commentDeleteText}>Delete</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
