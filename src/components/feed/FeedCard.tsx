import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { getImageUrl, posterBucket } from '@shared/imageUrl';
import { useFeedPosterViewer } from './useFeedPosterViewer';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { FeedAvatar } from './FeedAvatar';
import { FeedActionBar } from './FeedActionBar';
import { FeedContentBadge } from './FeedContentBadge';
import { FeedVideoPlayer } from './FeedVideoPlayer';
import { FollowButton } from './FollowButton';
import { FilmStripFrame } from './FilmStripFrame';
import { FilmStripFrameDivider } from './FilmStripFrameDivider';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { formatFullTimestamp } from '@/utils/formatDate';
import {
  getFeedTypeLabel,
  deriveEntityType,
  getEntityAvatarUrl,
  getEntityName,
  getEntityId,
} from '@/constants/feedHelpers';
import { createFeedCardStyles } from '@/styles/tabs/feed.styles';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { FeedEditorialCard } from './FeedEditorialCard';
import { FeedCastCrew } from './FeedCastCrew';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';
import type { ImageViewerTopChrome } from '@/providers/ImageViewerProvider';

export interface FeedCardProps {
  item: NewsFeedItem;
  onPress: (item: NewsFeedItem) => void;
  onEntityPress?: (entityType: FeedEntityType, entityId: string) => void;
  userVote?: 'up' | 'down' | null;
  isBookmarked?: boolean;
  onUpvote?: (itemId: string) => void;
  onDownvote?: (itemId: string) => void;
  onBookmark?: (itemId: string) => void;
  onComment?: (itemId: string) => void;
  onShare?: (itemId: string) => void;
  isVideoActive?: boolean;
  shouldMountVideo?: boolean;
  onVideoLayout?: (id: string, y: number, height: number) => void;
  isFollowing?: boolean;
  onFollow?: (entityType: FeedEntityType, entityId: string) => void;
  onUnfollow?: (entityType: FeedEntityType, entityId: string) => void;
  getImageViewerTopChrome?: () => ImageViewerTopChrome | undefined;
  isFirst?: boolean;
  showFullTimestamp?: boolean;
}

// @coupling FeedAvatar, FeedActionBar, FeedContentBadge, FeedVideoPlayer, FollowButton, FeedEditorialCard
function FeedCardInner({
  item,
  onPress,
  onEntityPress,
  userVote,
  isBookmarked,
  onUpvote,
  onDownvote,
  onBookmark,
  onComment,
  onShare,
  isVideoActive,
  shouldMountVideo,
  onVideoLayout,
  isFollowing,
  onFollow,
  onUnfollow,
  getImageViewerTopChrome,
  isFirst,
  showFullTimestamp,
}: FeedCardProps) {
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createFeedCardStyles(theme), [theme]);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const hasVideo = !!item.youtube_id;
  const isBackdrop = item.feed_type === 'backdrop';
  const imageUrl = item.thumbnail_url ?? item.movie?.poster_url ?? null; // @nullable both may be null
  const hasThumbnail = !!imageUrl;
  const isPosterImage = hasThumbnail && !hasVideo;
  const label = getFeedTypeLabel(item.content_type);
  const relativeTime = useRelativeTime(item.published_at);
  const entityType = deriveEntityType(item);
  const entityAvatarUrl = getEntityAvatarUrl(item);
  const avatarBucket =
    entityType === 'movie' ? posterBucket(item.movie?.poster_image_type) : undefined;
  const entityName = getEntityName(item);
  const entityId = getEntityId(item);
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (onVideoLayout)
        onVideoLayout(item.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height);
    },
    [item.id, onVideoLayout],
  );
  const imageBucket = isBackdrop
    ? ('BACKDROPS' as const)
    : item.feed_type === 'poster'
      ? ('POSTERS' as const)
      : posterBucket(item.movie?.poster_image_type);
  // @contract poster tap opens full-screen image viewer
  const {
    posterRef,
    posterHidden,
    handlePress: handlePosterPress,
  } = useFeedPosterViewer(imageUrl, imageBucket, isBackdrop, getImageViewerTopChrome);
  return (
    <View onLayout={hasVideo ? handleLayout : undefined}>
      {isFirst ? <FilmStripFrameDivider isEdge /> : null}
      <FilmStripFrame>
        <View style={styles.post}>
          <View style={styles.headerRow}>
            <View>
              <FeedAvatar
                imageUrl={entityAvatarUrl}
                entityType={entityType}
                bucketOverride={avatarBucket}
                size={entityType === 'movie' ? 64 : 56}
                label={entityName}
                onPress={
                  entityId && onEntityPress ? () => onEntityPress(entityType, entityId) : undefined
                }
              />
              <TouchableOpacity
                style={styles.avatarSpacer}
                activeOpacity={1}
                onPress={() => onPress(item)}
                accessibilityLabel="Open post"
              />
            </View>
            <View style={styles.headerMeta}>
              <View style={styles.nameRow}>
                {entityId && onEntityPress ? (
                  <TouchableOpacity
                    onPress={() => onEntityPress(entityType, entityId)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Go to ${entityName}`}
                  >
                    <Text style={styles.entityName} numberOfLines={1}>
                      {entityName}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.entityName} numberOfLines={1}>
                    {entityName}
                  </Text>
                )}
                {item.is_featured ? (
                  <Ionicons name="star" size={12} color={colors.yellow400} />
                ) : null}
              </View>
              {entityId && onFollow ? (
                <View style={styles.followWrap}>
                  <FollowButton
                    isFollowing={isFollowing ?? false}
                    entityName={entityName}
                    onPress={() =>
                      isFollowing
                        ? onUnfollow?.(entityType, entityId)
                        : onFollow(entityType, entityId)
                    }
                  />
                </View>
              ) : null}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onPress(item)}
                accessibilityLabel={`${label}: ${item.title}`}
              >
                <View style={styles.badgeTimestampRow}>
                  <FeedContentBadge contentType={item.content_type} />
                  <Text style={styles.timestamp}>{relativeTime}</Text>
                </View>
                {item.movie_id ? <FeedCastCrew movieId={item.movie_id} /> : null}
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!hasVideo && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onPress(item)}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${item.title} media`}
            >
              {item.description && !hasThumbnail ? (
                <Text style={styles.description} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}

              {isPosterImage ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handlePosterPress}
                  accessibilityLabel={`View ${item.title} ${isBackdrop ? 'backdrop' : 'poster'}`}
                >
                  <View
                    ref={posterRef}
                    collapsable={false}
                    style={[
                      isBackdrop ? styles.mediaContainer : styles.posterMediaContainer,
                      posterHidden && { opacity: 0 },
                    ]}
                  >
                    {!mediaLoaded ? (
                      <SkeletonBox width="100%" height="100%" borderRadius={0} />
                    ) : null}
                    <Image
                      source={{
                        uri:
                          (imageUrl
                            ? getImageUrl(imageUrl, 'md', imageBucket)
                            : /* istanbul ignore next */ null) ??
                          /* istanbul ignore next */ imageUrl ??
                          /* istanbul ignore next */ PLACEHOLDER_POSTER,
                      }}
                      style={styles.media}
                      contentFit="cover"
                      onLoad={() => setMediaLoaded(true)}
                    />
                  </View>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          )}

          {hasVideo ? (
            <View style={styles.mediaContainer}>
              <FeedVideoPlayer
                youtubeId={
                  item.youtube_id ??
                  /* istanbul ignore next -- youtube_id always present when hasVideo is true */ ''
                }
                thumbnailUrl={item.thumbnail_url}
                isActive={isVideoActive ?? false}
                shouldMount={shouldMountVideo ?? isVideoActive ?? false}
              />
            </View>
          ) : null}
          <View style={styles.actionBar}>
            <FeedActionBar
              commentCount={item.comment_count}
              upvoteCount={item.upvote_count}
              downvoteCount={item.downvote_count}
              viewCount={item.view_count}
              userVote={userVote ?? null}
              isBookmarked={isBookmarked ?? false}
              bookmarkCount={item.bookmark_count}
              onComment={onComment ? () => onComment(item.id) : undefined}
              onUpvote={onUpvote ? () => onUpvote(item.id) : undefined}
              onDownvote={onDownvote ? () => onDownvote(item.id) : undefined}
              onBookmark={onBookmark ? () => onBookmark(item.id) : undefined}
              onShare={onShare ? () => onShare(item.id) : undefined}
            />
          </View>
          {showFullTimestamp ? (
            <View style={styles.fullTimestampRow}>
              <Ionicons name="time-outline" size={15} color={colors.gray500} />
              <Text style={styles.fullTimestampText}>{formatFullTimestamp(item.published_at)}</Text>
            </View>
          ) : null}
          <View style={styles.separator} />
        </View>
      </FilmStripFrame>
      <FilmStripFrameDivider />
    </View>
  );
}

// @sync custom memo — callback props excluded; parent must stabilize them
const FeedCardMemo = React.memo(FeedCardInner, (prev, next) => {
  const p = prev.item,
    n = next.item;
  return (
    p.id === n.id &&
    prev.userVote === next.userVote &&
    prev.isBookmarked === next.isBookmarked &&
    prev.isVideoActive === next.isVideoActive &&
    prev.shouldMountVideo === next.shouldMountVideo &&
    prev.isFollowing === next.isFollowing &&
    p.upvote_count === n.upvote_count &&
    p.downvote_count === n.downvote_count &&
    p.view_count === n.view_count &&
    p.comment_count === n.comment_count &&
    p.bookmark_count === n.bookmark_count &&
    p.movie?.poster_image_type === n.movie?.poster_image_type
  );
});
export function FeedCard(props: FeedCardProps) {
  if (props.item.feed_type === 'editorial') return <FeedEditorialCard {...props} />;
  return <FeedCardMemo {...props} />;
}
