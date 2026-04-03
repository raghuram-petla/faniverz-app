import { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

export interface FollowButtonProps {
  isFollowing: boolean;
  onPress: () => void;
  entityName?: string;
}

// @sideeffect triggers reanimated scale bounce on follow transition (unfollowed -> followed)
// @assumes onPress is auth-gated by the parent — this component doesn't check authentication
export function FollowButton({ isFollowing, onPress, entityName }: FollowButtonProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
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
      style={[
        styles.button,
        isFollowing ? { borderColor: colors.red500 } : { borderColor: theme.textSecondary },
      ]}
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
          color={isFollowing ? colors.red500 : theme.textSecondary}
        />
      </Animated.View>
      <Text style={[styles.text, { color: isFollowing ? colors.red500 : theme.textSecondary }]}>
        {isFollowing ? t('common.following') : t('common.follow')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
