import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as palette } from '@/theme/colors';
import type { MovieActionType } from '@/hooks/useMovieAction';

export interface MovieQuickActionProps {
  actionType: MovieActionType;
  isActive: boolean;
  onPress: () => void;
  movieTitle: string;
  style?: ViewStyle;
}

export function MovieQuickAction({
  actionType,
  isActive,
  onPress,
  movieTitle,
  style,
}: MovieQuickActionProps) {
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

  return (
    <TouchableOpacity
      style={[styles.overlay, isActive && styles.overlayActive, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={isActive ? activeLabel : inactiveLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name={icon} size={14} color={isActive ? palette.green500 : '#FFFFFF'} />
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
