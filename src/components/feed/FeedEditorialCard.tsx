import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { FeedAvatar } from './FeedAvatar';
import { FeedActionBar } from './FeedActionBar';
import { FeedContentBadge } from './FeedContentBadge';
import { FollowButton } from './FollowButton';
import { FilmStripFrame } from './FilmStripFrame';
import { FilmStripFrameDivider } from './FilmStripFrameDivider';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { getEntityAvatarUrl, getEntityName, getEntityId } from '@/constants/feedHelpers';
import { posterBucket } from '@shared/imageUrl';
import { CRAFT_NAMES, CRAFT_LABELS } from '@shared/constants';
import { createFeedCardStyles } from '@/styles/tabs/feed.styles';
import { useEditorialReview } from '@/features/editorial/hooks';
import type { FeedCardProps } from './FeedCard';
import type { CraftName } from '@shared/types';

const WORD_LIMIT = 100;

// @contract truncates text to ~100 words with "..." suffix
function truncateWords(text: string, limit: number): { truncated: string; wasTruncated: boolean } {
  const words = text.split(/\s+/);
  if (words.length <= limit) return { truncated: text, wasTruncated: false };
  return { truncated: words.slice(0, limit).join(' ') + '...', wasTruncated: true };
}

// @contract specialized card for editorial review feed items — shows full review content
// @coupling fetches editorial review data via useEditorialReview hook for craft ratings
export function FeedEditorialCardInner({
  item,
  onEntityPress,
  userVote,
  isBookmarked,
  onUpvote,
  onDownvote,
  onBookmark,
  onComment,
  onShare,
  isFollowing,
  onFollow,
  onUnfollow,
}: FeedCardProps) {
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createFeedCardStyles(theme), [theme]);
  const relativeTime = useRelativeTime(item.published_at);
  const [expanded, setExpanded] = useState(false);

  const avatarUrl = getEntityAvatarUrl(item);
  const entityName = getEntityName(item);
  const entityId = getEntityId(item);
  const entityType = 'movie' as const;

  // @boundary fetch full editorial review for craft ratings display
  const { data: review } = useEditorialReview(item.movie_id ?? '');

  const bodyResult = item.description ? truncateWords(item.description, WORD_LIMIT) : null;

  return (
    <View>
      <FilmStripFrame>
        <View style={styles.post}>
          {/* Header row: avatar + meta + follow */}
          <View style={styles.headerRow}>
            <View>
              <FeedAvatar
                imageUrl={avatarUrl}
                entityType={entityType}
                bucketOverride={posterBucket(item.movie?.poster_image_type)}
                size={64}
                label={entityName}
                onPress={() => entityId && onEntityPress?.(entityType, entityId)}
              />
            </View>
            <View style={styles.headerMeta}>
              <TouchableOpacity
                onPress={() => entityId && onEntityPress?.(entityType, entityId)}
                activeOpacity={0.7}
              >
                <Text style={styles.entityName} numberOfLines={1}>
                  {entityName}
                </Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FeedContentBadge contentType={item.content_type} />
                <Text style={styles.timestamp}>{relativeTime}</Text>
              </View>
              {/* Overall rating below badge */}
              {item.editorial_rating != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="star" size={14} color={colors.yellow400} />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary }}>
                    {item.editorial_rating.toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textTertiary }}>/ 5</Text>
                </View>
              )}
              {entityId && onFollow && (
                <View style={styles.followWrap}>
                  <FollowButton
                    isFollowing={!!isFollowing}
                    entityName={entityName}
                    onPress={() =>
                      isFollowing
                        ? onUnfollow?.(entityType, entityId)
                        : onFollow(entityType, entityId)
                    }
                  />
                </View>
              )}
            </View>
          </View>

          {/* Editorial content — full review inline */}
          <View style={{ marginHorizontal: 12, marginTop: 10 }}>
            {/* Craft ratings */}
            {review && (
              <View
                style={{
                  backgroundColor: theme.surfaceElevated,
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                }}
              >
                {CRAFT_NAMES.map((craft: CraftName) => {
                  const rating = review[`rating_${craft}` as keyof typeof review] as number;
                  return (
                    <View
                      key={craft}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3 }}
                    >
                      <Text style={{ width: 100, fontSize: 12, color: theme.textSecondary }}>
                        {CRAFT_LABELS[craft]}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= rating ? 'star' : 'star-outline'}
                            size={12}
                            color={s <= rating ? colors.yellow400 : theme.textDisabled}
                          />
                        ))}
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textTertiary, marginLeft: 6 }}>
                        ({rating})
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Verdict */}
            {review?.verdict && (
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  fontStyle: 'italic',
                  color: theme.textPrimary,
                  marginBottom: 6,
                }}
              >
                "{review.verdict}"
              </Text>
            )}

            {/* Body text — 100 words then "Show more" */}
            {bodyResult && (
              <View>
                <Text style={{ fontSize: 13, lineHeight: 19, color: theme.textSecondary }}>
                  {expanded ? item.description : bodyResult.truncated}
                </Text>
                {bodyResult.wasTruncated && !expanded && (
                  <Pressable onPress={() => setExpanded(true)}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: colors.red600,
                        marginTop: 4,
                      }}
                    >
                      Show more
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Action bar */}
          <View style={styles.actionBar}>
            <FeedActionBar
              commentCount={item.comment_count}
              upvoteCount={item.upvote_count}
              downvoteCount={item.downvote_count}
              viewCount={item.view_count}
              userVote={userVote ?? null}
              isBookmarked={isBookmarked ?? false}
              onUpvote={() => onUpvote?.(item.id)}
              onDownvote={() => onDownvote?.(item.id)}
              onBookmark={() => onBookmark?.(item.id)}
              onComment={() => onComment?.(item.id)}
              onShare={() => onShare?.(item.id)}
            />
          </View>
        </View>
      </FilmStripFrame>
      <FilmStripFrameDivider />
    </View>
  );
}

// @sync memo comparator — editorial cards also compare editorial_rating
export const FeedEditorialCard = React.memo(FeedEditorialCardInner, (prev, next) => {
  const p = prev.item,
    n = next.item;
  return (
    p.id === n.id &&
    prev.userVote === next.userVote &&
    prev.isBookmarked === next.isBookmarked &&
    prev.isFollowing === next.isFollowing &&
    p.upvote_count === n.upvote_count &&
    p.downvote_count === n.downvote_count &&
    p.view_count === n.view_count &&
    p.comment_count === n.comment_count &&
    p.bookmark_count === n.bookmark_count &&
    p.editorial_rating === n.editorial_rating
  );
});
