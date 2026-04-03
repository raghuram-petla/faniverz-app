import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/utils/formatDate';
import { createPostDetailStyles } from '@/styles/postDetail.styles';
import type { FeedComment } from '@shared/types';

/** @coupling formatRelativeTime from formatDate — renders "2m ago" style timestamps */
export interface CommentItemProps {
  comment: FeedComment;
  /** @assumes Caller compares comment.user_id against session userId to determine ownership */
  isOwn: boolean;
  onDelete?: (commentId: string) => void;
}

export function CommentItem({ comment, isOwn, onDelete }: CommentItemProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createPostDetailStyles(theme);
  /** @nullable profile may be null for deleted users; falls back to 'anonymous' */
  const displayName = comment.profile?.display_name ?? t('feed.anonymous');

  return (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <Ionicons name="person-circle" size={24} color={colors.gray500} />
      </View>
      <View style={styles.commentContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.commentName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.commentTime}>{formatRelativeTime(comment.created_at)}</Text>
        </View>
        {/* @edge User-generated comment text; cap to prevent unbounded expansion */}
        <Text style={styles.commentBody} numberOfLines={8}>
          {comment.body}
        </Text>
        {/* @contract delete button only shown when isOwn=true AND onDelete provided */}
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
  );
}
