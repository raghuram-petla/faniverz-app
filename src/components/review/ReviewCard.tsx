import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import StarRating from '@/components/ui/StarRating';
import type { ReviewWithProfile } from '@/features/reviews/api';

interface ReviewCardProps {
  review: ReviewWithProfile;
  isOwn: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function ReviewCard({ review, isOwn, onEdit, onDelete }: ReviewCardProps) {
  const { colors } = useTheme();
  const [spoilerRevealed, setSpoilerRevealed] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const displayName = review.profile?.display_name ?? 'Anonymous';
  const initial = displayName.charAt(0).toUpperCase();
  const bodyText = review.body ?? '';
  const isTruncated = bodyText.length > 200 && !expanded;

  return (
    <View testID="review-card" style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.header}>
        <View testID="reviewer-avatar" style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text testID="reviewer-name" style={[styles.name, { color: colors.text }]}>
            {displayName}
          </Text>
          <Text style={[styles.date, { color: colors.textTertiary }]}>
            {formatRelativeTime(review.created_at)}
          </Text>
        </View>
        <StarRating rating={review.rating} size={14} />
      </View>

      {review.title && (
        <Text testID="review-title" style={[styles.title, { color: colors.text }]}>
          {review.title}
        </Text>
      )}

      {bodyText.length > 0 && (
        <View>
          {review.is_spoiler && !spoilerRevealed ? (
            <TouchableOpacity testID="spoiler-blur" onPress={() => setSpoilerRevealed(true)}>
              <Text style={[styles.spoilerText, { color: colors.textSecondary }]}>
                Contains spoilers — tap to reveal
              </Text>
            </TouchableOpacity>
          ) : (
            <Text testID="review-body" style={[styles.body, { color: colors.textSecondary }]}>
              {isTruncated ? `${bodyText.slice(0, 200)}...` : bodyText}
            </Text>
          )}
          {bodyText.length > 200 && !review.is_spoiler && (
            <TouchableOpacity testID="read-more" onPress={() => setExpanded(!expanded)}>
              <Text style={[styles.readMore, { color: colors.primary }]}>
                {expanded ? 'Show less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isOwn && (
        <View testID="own-review-actions" style={styles.actions}>
          <TouchableOpacity testID="edit-review" onPress={onEdit}>
            <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="delete-review" onPress={onDelete}>
            <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  spoilerText: {
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  readMore: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
