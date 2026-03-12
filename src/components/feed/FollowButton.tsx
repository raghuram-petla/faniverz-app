import { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

export interface FollowButtonProps {
  isFollowing: boolean;
  onPress: () => void;
  entityName?: string;
}

export function FollowButton({ isFollowing, onPress, entityName }: FollowButtonProps) {
  const iconScale = useSharedValue(1);
  const prevFollowing = useRef(isFollowing);
  const animationsEnabled = useAnimationsEnabled();

  useEffect(() => {
    if (animationsEnabled && isFollowing && !prevFollowing.current) {
      iconScale.value = withSequence(
        withTiming(0.6, { duration: 100 }),
        withTiming(1.3, { duration: 150 }),
        withTiming(1.0, { duration: 100 }),
      );
    }
    prevFollowing.current = isFollowing;
  }, [isFollowing, iconScale, animationsEnabled]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <TouchableOpacity
      style={[styles.button, isFollowing ? styles.buttonFollowing : styles.buttonDefault]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        isFollowing
          ? `Following ${entityName ?? 'entity'}, tap to unfollow`
          : `Follow ${entityName ?? 'entity'}`
      }
    >
      <Animated.View style={animatedIconStyle}>
        <Ionicons
          name={isFollowing ? 'heart' : 'heart-outline'}
          size={14}
          color={isFollowing ? colors.green500 : colors.gray500}
        />
      </Animated.View>
      <Text style={[styles.text, { color: isFollowing ? colors.green500 : colors.gray500 }]}>
        {isFollowing ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonDefault: {
    borderColor: colors.gray500,
  },
  buttonFollowing: {
    borderColor: colors.green500,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
