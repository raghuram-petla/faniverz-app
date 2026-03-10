import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { colors } from '@/theme/colors';

export interface FollowButtonProps {
  isFollowing: boolean;
  onPress: () => void;
  entityName?: string;
}

export function FollowButton({ isFollowing, onPress, entityName }: FollowButtonProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isFollowing
          ? { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
          : { borderColor: colors.red600 },
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
      <Text style={[styles.text, { color: isFollowing ? theme.textSecondary : colors.red600 }]}>
        {isFollowing ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
