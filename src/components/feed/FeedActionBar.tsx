import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { formatCompactNumber } from '@/utils/formatNumber';

export interface FeedActionBarProps {
  commentCount: number;
  upvoteCount: number;
  downvoteCount: number;
  viewCount: number;
  userVote: 'up' | 'down' | null;
  onComment?: () => void;
  onUpvote?: () => void;
  onDownvote?: () => void;
  onShare?: () => void;
}

export function FeedActionBar({
  commentCount,
  upvoteCount,
  downvoteCount,
  viewCount,
  userVote,
  onComment,
  onUpvote,
  onDownvote,
  onShare,
}: FeedActionBarProps) {
  const { theme, colors } = useTheme();
  const defaultColor = theme.textSecondary;
  // @edge all counts default to 0 to handle null/undefined from API responses
  const safeComments = commentCount ?? 0;
  const safeUpvotes = upvoteCount ?? 0;
  const safeDownvotes = downvoteCount ?? 0;
  const safeViews = viewCount ?? 0;

  // @contract active vote highlights in green (up) or red (down); null = tertiary
  const upColor = userVote === 'up' ? colors.green500 : defaultColor;
  const downColor = userVote === 'down' ? colors.red500 : defaultColor;

  return (
    <View style={styles.container}>
      {/* Comments */}
      <TouchableOpacity
        style={styles.actionItem}
        onPress={onComment}
        disabled={!onComment}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Comments, ${safeComments} comments`}
      >
        <Ionicons name="chatbubble-outline" size={22} color={defaultColor} />
        <Text style={[styles.count, { color: defaultColor }]}>
          {formatCompactNumber(safeComments)}
        </Text>
      </TouchableOpacity>

      {/* Upvote */}
      <TouchableOpacity
        style={styles.actionItem}
        onPress={onUpvote}
        disabled={!onUpvote}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Upvote, ${safeUpvotes} upvotes`}
      >
        <Ionicons
          name={userVote === 'up' ? 'arrow-up' : 'arrow-up-outline'}
          size={22}
          color={upColor}
        />
        <Text style={[styles.count, { color: upColor }]}>{formatCompactNumber(safeUpvotes)}</Text>
      </TouchableOpacity>

      {/* Downvote */}
      <TouchableOpacity
        style={styles.actionItem}
        onPress={onDownvote}
        disabled={!onDownvote}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Downvote, ${safeDownvotes} downvotes`}
      >
        <Ionicons
          name={userVote === 'down' ? 'arrow-down' : 'arrow-down-outline'}
          size={22}
          color={downColor}
        />
        <Text style={[styles.count, { color: downColor }]}>
          {formatCompactNumber(safeDownvotes)}
        </Text>
      </TouchableOpacity>

      {/* Views */}
      <View style={styles.actionItem} accessibilityLabel={`${safeViews} views`}>
        <Ionicons name="eye-outline" size={22} color={defaultColor} />
        <Text style={[styles.count, { color: defaultColor }]}>
          {formatCompactNumber(safeViews)}
        </Text>
      </View>

      {/* Share */}
      <TouchableOpacity
        style={styles.actionItem}
        onPress={onShare}
        disabled={!onShare}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Share"
      >
        <Ionicons name="share-outline" size={22} color={defaultColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    fontSize: 15,
    fontWeight: '500',
  },
});
