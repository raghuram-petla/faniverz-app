import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export interface VoteButtonsProps {
  upvoteCount: number;
  downvoteCount: number;
  userVote: 'up' | 'down' | null;
  onUpvote: () => void;
  onDownvote: () => void;
}

export function VoteButtons({
  upvoteCount,
  downvoteCount,
  userVote,
  onUpvote,
  onDownvote,
}: VoteButtonsProps) {
  const { theme, colors } = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.voteBtn, userVote === 'up' && { backgroundColor: colors.green600_20 }]}
        onPress={onUpvote}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Upvote, ${upvoteCount} upvotes`}
      >
        <Ionicons
          name={userVote === 'up' ? 'arrow-up' : 'arrow-up-outline'}
          size={16}
          color={userVote === 'up' ? colors.green500 : theme.textSecondary}
        />
        <Text
          style={[
            styles.voteCount,
            { color: userVote === 'up' ? colors.green500 : theme.textSecondary },
          ]}
        >
          {upvoteCount}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.voteBtn, userVote === 'down' && { backgroundColor: colors.red600_20 }]}
        onPress={onDownvote}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Downvote, ${downvoteCount} downvotes`}
      >
        <Ionicons
          name={userVote === 'down' ? 'arrow-down' : 'arrow-down-outline'}
          size={16}
          color={userVote === 'down' ? colors.red500 : theme.textSecondary}
        />
        <Text
          style={[
            styles.voteCount,
            { color: userVote === 'down' ? colors.red500 : theme.textSecondary },
          ]}
        >
          {downvoteCount}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  voteCount: {
    fontSize: 13,
    fontWeight: '600',
  },
});
