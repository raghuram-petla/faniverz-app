import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export interface FollowButtonProps {
  isFollowing: boolean;
  onPress: () => void;
  entityName?: string;
}

export function FollowButton({ isFollowing, onPress, entityName }: FollowButtonProps) {
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
      <Ionicons
        name={isFollowing ? 'heart' : 'heart-outline'}
        size={14}
        color={isFollowing ? colors.green500 : colors.gray500}
      />
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
