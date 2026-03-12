import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

export interface VoteButtonsProps {
  upvoteCount: number;
  downvoteCount: number;
  userVote: 'up' | 'down' | null;
  onUpvote: () => void;
  onDownvote: () => void;
}

function bounceScale(sv: SharedValue<number>) {
  sv.value = withSequence(
    withTiming(0.7, { duration: 80 }),
    withTiming(1.15, { duration: 120 }),
    withTiming(1.0, { duration: 80 }),
  );
}

export function VoteButtons({
  upvoteCount,
  downvoteCount,
  userVote,
  onUpvote,
  onDownvote,
}: VoteButtonsProps) {
  const { theme, colors } = useTheme();
  const upScale = useSharedValue(1);
  const downScale = useSharedValue(1);
  const prevVote = useRef(userVote);
  const animationsEnabled = useAnimationsEnabled();

  useEffect(() => {
    if (userVote !== prevVote.current) {
      if (animationsEnabled) {
        if (userVote === 'up') bounceScale(upScale);
        if (userVote === 'down') bounceScale(downScale);
      }
      prevVote.current = userVote;
    }
  }, [userVote, upScale, downScale, animationsEnabled]);

  const upIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: upScale.value }],
  }));
  const downIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: downScale.value }],
  }));

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.voteBtn, userVote === 'up' && { backgroundColor: colors.green600_20 }]}
        onPress={onUpvote}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Upvote, ${upvoteCount} upvotes`}
      >
        <Animated.View style={upIconStyle}>
          <Ionicons
            name={userVote === 'up' ? 'arrow-up' : 'arrow-up-outline'}
            size={16}
            color={userVote === 'up' ? colors.green500 : theme.textSecondary}
          />
        </Animated.View>
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
        <Animated.View style={downIconStyle}>
          <Ionicons
            name={userVote === 'down' ? 'arrow-down' : 'arrow-down-outline'}
            size={16}
            color={userVote === 'down' ? colors.red500 : theme.textSecondary}
          />
        </Animated.View>
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
