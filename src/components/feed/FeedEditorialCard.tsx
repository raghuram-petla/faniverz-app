import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { FeedAvatar } from './FeedAvatar';
import { FeedActionBar } from './FeedActionBar';
import { FeedContentBadge } from './FeedContentBadge';
import { FollowButton } from './FollowButton';
import { FilmStripFrame } from './FilmStripFrame';
import { FilmStripFrameDivider } from './FilmStripFrameDivider';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { getEntityAvatarUrl, getEntityName, getEntityId } from '@/constants/feedHelpers';
import { getImageUrl, posterBucket } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { createFeedCardStyles } from '@/styles/tabs/feed.styles';
import type { FeedCardProps } from './FeedCard';

// @contract specialized card for editorial review feed items
// @coupling navigates to movie detail page (not post detail) via "Read Full Review"
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
  const router = useRouter();
  const relativeTime = useRelativeTime(item.published_at);

  const avatarUrl = getEntityAvatarUrl(item);
  const entityName = getEntityName(item);
  const entityId = getEntityId(item);
  const entityType = 'movie' as const;
  const imgBucket = posterBucket(item.movie?.poster_image_type);
  const imgUrl = item.thumbnail_url
    ? getImageUrl(item.thumbnail_url, 'md', imgBucket)
    : PLACEHOLDER_POSTER;

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

          {/* Editorial content: poster + rating + verdict */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => item.movie_id && router.push(`/movie/${item.movie_id}`)}
            style={{
              flexDirection: 'row',
              backgroundColor: theme.surfaceElevated,
              borderRadius: 12,
              overflow: 'hidden',
              marginHorizontal: 12,
              marginTop: 10,
            }}
          >
            <Image source={imgUrl} style={{ width: 80, height: 120 }} contentFit="cover" />
            <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
              {item.editorial_rating != null && (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}
                >
                  <Ionicons name="star" size={20} color={colors.yellow400} />
                  <Text style={{ fontSize: 22, fontWeight: '800', color: theme.textPrimary }}>
                    {item.editorial_rating.toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.textTertiary }}>/ 5</Text>
                </View>
              )}
              {item.description && (
                <Text
                  style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18 }}
                  numberOfLines={3}
                >
                  {item.description}
                </Text>
              )}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.red600, marginTop: 6 }}>
                Read Full Review →
              </Text>
            </View>
          </TouchableOpacity>

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

// @sync memo comparator matches FeedCard's comparator + editorial_rating
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
