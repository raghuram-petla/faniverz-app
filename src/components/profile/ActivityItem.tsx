import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { useTranslation } from 'react-i18next';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import type { UserActivity } from '@/features/profile';
import type { SemanticTheme } from '@shared/themes';

export interface ActivityItemProps {
  activity: UserActivity;
  onPress: () => void;
}

/** @boundary action_type is a string from the DB; unknown types fall through to vote config */
const ACTION_CONFIG: Record<string, { icon: string; labelKey: string; color: string }> = {
  vote: { icon: 'heart', labelKey: 'profile.votedOnPost', color: palette.blue500 },
  follow: { icon: 'heart', labelKey: 'profile.followedEntity', color: palette.red500 },
  unfollow: { icon: 'heart-dislike', labelKey: 'profile.unfollowedEntity', color: palette.gray500 },
  comment: { icon: 'chatbubble', labelKey: 'profile.commentedOnPost', color: palette.violet500 },
  review: { icon: 'star', labelKey: 'profile.wroteReview', color: palette.amber500 },
};

const ENTITY_LABEL_KEYS: Record<string, string> = {
  movie: 'profile.entityMovie',
  actor: 'profile.entityActor',
  production_house: 'profile.entityStudio',
  feed_item: 'profile.entityPost',
};

export function ActivityItem({ activity, onPress }: ActivityItemProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  /** @edge unknown action_type defaults to vote config to prevent crash */
  const config = ACTION_CONFIG[activity.action_type] ?? ACTION_CONFIG.vote;
  const relativeTime = useRelativeTime(activity.created_at);

  /** @contract follow/unfollow labels include the entity type suffix; other actions use label alone */
  const label =
    activity.action_type === 'follow' || activity.action_type === 'unfollow'
      ? `${t(config.labelKey)} ${t(ENTITY_LABEL_KEYS[activity.entity_type] ?? '')}`
      : t(config.labelKey);

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
        <Text style={styles.time}>{relativeTime}</Text>
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
