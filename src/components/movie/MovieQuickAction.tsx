import { useCallback, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors as palette } from '@/theme/colors';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import type { MovieActionType } from '@/hooks/useMovieAction';

export interface MovieQuickActionProps {
  actionType: MovieActionType;
  isActive: boolean;
  onPress: () => void;
  movieTitle: string;
  style?: ViewStyle;
}

const BOUNCE_SEQUENCE = [
  { value: 0.6, duration: 100 },
  { value: 1.2, duration: 150 },
  { value: 1.0, duration: 100 },
];

export function MovieQuickAction({
  actionType,
  isActive,
  onPress,
  movieTitle,
  style,
}: MovieQuickActionProps) {
  const iconScale = useSharedValue(1);
  const prevActive = useSharedValue(isActive ? 1 : 0);
  const animationsEnabled = useAnimationsEnabled();

  // Bounce on activation (not on initial render)
  useEffect(() => {
    const wasActive = prevActive.value === 1;
    prevActive.value = isActive ? 1 : 0;
    if (isActive && !wasActive && animationsEnabled) {
      iconScale.value = withSequence(
        withTiming(BOUNCE_SEQUENCE[0].value, { duration: BOUNCE_SEQUENCE[0].duration }),
        withTiming(BOUNCE_SEQUENCE[1].value, { duration: BOUNCE_SEQUENCE[1].duration }),
        withTiming(BOUNCE_SEQUENCE[2].value, { duration: BOUNCE_SEQUENCE[2].duration }),
      );
    }
  }, [isActive, iconScale, prevActive, animationsEnabled]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const icon = isActive
    ? actionType === 'follow'
      ? 'heart'
      : 'bookmark'
    : actionType === 'follow'
      ? 'heart-outline'
      : 'bookmark-outline';

  const activeLabel =
    actionType === 'follow'
      ? `Following ${movieTitle}, tap to unfollow`
      : `${movieTitle} saved, tap to remove`;
  const inactiveLabel = actionType === 'follow' ? `Follow ${movieTitle}` : `Save ${movieTitle}`;

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      style={[styles.overlay, isActive && styles.overlayActive, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={isActive ? activeLabel : inactiveLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={animatedIconStyle}>
        <Ionicons name={icon} size={14} color={isActive ? palette.green500 : palette.white} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayActive: {
    backgroundColor: 'rgba(34,197,94,0.25)',
  },
});
