import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { getFeedTypeColor, getFeedTypeLabel, getFeedTypeIconName } from '@/constants/feedHelpers';

export interface FeedContentBadgeProps {
  contentType: string;
  size?: 'small' | 'normal';
}

/** @coupling feedHelpers — color, label, and icon derived from content_type string */
export function FeedContentBadge({ contentType, size = 'normal' }: FeedContentBadgeProps) {
  /** @boundary contentType is an arbitrary string; feedHelpers must handle unknown values */
  const bgColor = getFeedTypeColor(contentType);
  const label = getFeedTypeLabel(contentType);
  const iconName = getFeedTypeIconName(contentType);
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, isSmall && styles.badgeSmall]}>
      <Ionicons name={iconName} size={isSmall ? 10 : 13} color={colors.white} />
      <Text style={[styles.label, isSmall && styles.labelSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  labelSmall: {
    fontSize: 10,
  },
});
