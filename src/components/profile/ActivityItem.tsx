import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { formatRelativeTime } from '@/utils/formatDate';
import type { UserActivity } from '@/features/profile';
import type { SemanticTheme } from '@shared/themes';

export interface ActivityItemProps {
  activity: UserActivity;
  onPress: () => void;
}

const ACTION_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  vote: { icon: 'arrow-up', label: 'Voted on a post', color: palette.blue500 },
  follow: { icon: 'heart', label: 'Followed', color: palette.red500 },
  unfollow: { icon: 'heart-dislike', label: 'Unfollowed', color: palette.gray500 },
  comment: { icon: 'chatbubble', label: 'Commented on a post', color: palette.violet500 },
  review: { icon: 'star', label: 'Wrote a review', color: palette.amber500 },
};

function getEntityLabel(entityType: string): string {
  switch (entityType) {
    case 'movie':
      return 'a movie';
    case 'actor':
      return 'an actor';
    case 'production_house':
      return 'a studio';
    case 'feed_item':
      return 'a post';
    default:
      return '';
  }
}

export function ActivityItem({ activity, onPress }: ActivityItemProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const config = ACTION_CONFIG[activity.action_type] ?? ACTION_CONFIG.vote;

  const label =
    activity.action_type === 'follow' || activity.action_type === 'unfollow'
      ? `${config.label} ${getEntityLabel(activity.entity_type)}`
      : config.label;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityLabel={label}>
      <View style={[styles.iconCircle, { backgroundColor: config.color + '20' }]}>
        <Ionicons
          name={config.icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={config.color}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(activity.created_at)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
    </TouchableOpacity>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { flex: 1, gap: 2 },
    label: { fontSize: 14, fontWeight: '500', color: t.textPrimary },
    time: { fontSize: 12, color: t.textTertiary },
  });
