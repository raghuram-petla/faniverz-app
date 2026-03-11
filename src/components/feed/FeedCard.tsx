import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useImageViewer } from '@/providers/ImageViewerProvider';
import { measureView } from '@/utils/measureView';
import { getImageUrl } from '@shared/imageUrl';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { FeedAvatar } from './FeedAvatar';
import { FeedActionBar } from './FeedActionBar';
import { FeedContentBadge } from './FeedContentBadge';
import { FeedVideoPlayer } from './FeedVideoPlayer';
import { FollowButton } from './FollowButton';
import {
  formatRelativeTime,
  getFeedTypeLabel,
  deriveEntityType,
  getEntityAvatarUrl,
  getEntityName,
  getEntityId,
} from '@/constants/feedHelpers';
import { createFeedCardStyles } from '@/styles/tabs/feed.styles';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';

export interface FeedCardProps {
  item: NewsFeedItem;
  onPress: (item: NewsFeedItem) => void;
  onEntityPress?: (entityType: FeedEntityType, entityId: string) => void;
  userVote?: 'up' | 'down' | null;
  onUpvote?: (itemId: string) => void;
  onDownvote?: (itemId: string) => void;
  onComment?: (itemId: string) => void;
  onShare?: (itemId: string) => void;
  isVideoActive?: boolean;
  onVideoLayout?: (id: string, y: number, height: number) => void;
  isFollowing?: boolean;
  onFollow?: (entityType: FeedEntityType, entityId: string) => void;
  onUnfollow?: (entityType: FeedEntityType, entityId: string) => void;
}

function FeedCardInner({
  item,
  onPress,
  onEntityPress,
  userVote,
  onUpvote,
  onDownvote,
  onComment,
  onShare,
  isVideoActive,
  onVideoLayout,
  isFollowing,
  onFollow,
  onUnfollow,
}: FeedCardProps) {
  const { theme, colors } = useTheme();
  const styles = createFeedCardStyles(theme);
  const { openImage } = useImageViewer();
  const posterRef = useRef<View>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const hasVideo = !!item.youtube_id;
  const imageUrl = item.thumbnail_url ?? item.movie?.poster_url ?? null;
  const hasThumbnail = !!imageUrl;
  const isPosterImage = hasThumbnail && !hasVideo;
  const label = getFeedTypeLabel(item.content_type);

  const entityType = deriveEntityType(item);
  const entityAvatarUrl = getEntityAvatarUrl(item);
  const entityName = getEntityName(item);
  const entityId = getEntityId(item);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (onVideoLayout) {
        const { y, height } = e.nativeEvent.layout;
        onVideoLayout(item.id, y, height);
      }
    },
    [item.id, onVideoLayout],
  );

  const handlePosterPress = useCallback(() => {
    if (!imageUrl) return;
    measureView(posterRef, (layout) => {
      openImage({
        feedUrl: getImageUrl(imageUrl, 'md') ?? imageUrl,
        fullUrl: imageUrl,
        sourceLayout: layout,
        sourceRef: posterRef,
        borderRadius: 12,
      });
    });
  }, [imageUrl, openImage]);

  return (
    <View style={styles.post} onLayout={hasVideo ? handleLayout : undefined}>
      {/* Left column: avatar + tappable space below */}
      <TouchableOpacity
        style={styles.avatarColumn}
        activeOpacity={0.7}
        onPress={() => onPress(item)}
        accessibilityLabel={`Open ${item.title}`}
      >
        <FeedAvatar
          imageUrl={entityAvatarUrl}
          entityType={entityType}
          label={entityName}
          onPress={
            entityId && onEntityPress ? () => onEntityPress(entityType, entityId) : undefined
          }
        />
      </TouchableOpacity>

      {/* Right column: all content */}
      <View style={styles.contentColumn}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${item.title}`}
        >
          {/* Name row */}
          <View style={styles.nameRow}>
            <View style={styles.nameRowLeft}>
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
              <Text style={styles.dot}>·</Text>
              <Text style={styles.timestamp}>{formatRelativeTime(item.published_at)}</Text>
            </View>
            {entityId && onFollow ? (
              <FollowButton
                isFollowing={isFollowing ?? false}
                entityName={entityName}
                onPress={() =>
                  isFollowing ? onUnfollow?.(entityType, entityId) : onFollow(entityType, entityId)
                }
              />
            ) : null}
          </View>

          {/* Badge + Title */}
          <View style={styles.badgeRow}>
            <FeedContentBadge contentType={item.content_type} />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Description for text-only items */}
          {item.description && !hasThumbnail ? (
            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}

          {/* Media: video player or static image */}
          {hasVideo ? (
            <FeedVideoPlayer
              youtubeId={item.youtube_id!}
              thumbnailUrl={item.thumbnail_url}
              duration={item.duration}
              isActive={isVideoActive ?? false}
            />
          ) : isPosterImage ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePosterPress}
              accessibilityLabel={`View ${item.title} poster`}
            >
              <View ref={posterRef} collapsable={false} style={styles.posterMediaContainer}>
                {!mediaLoaded ? <SkeletonBox width="100%" height="100%" borderRadius={0} /> : null}
                <Image
                  source={{ uri: getImageUrl(imageUrl!, 'md') ?? imageUrl! }}
                  style={styles.media}
                  contentFit="cover"
                  onLoad={() => setMediaLoaded(true)}
                />
              </View>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>

        {/* Action bar */}
        <View style={styles.actionBar}>
          <FeedActionBar
            commentCount={item.comment_count}
            upvoteCount={item.upvote_count}
            downvoteCount={item.downvote_count}
            viewCount={item.view_count}
            userVote={userVote ?? null}
            onComment={onComment ? () => onComment(item.id) : undefined}
            onUpvote={onUpvote ? () => onUpvote(item.id) : undefined}
            onDownvote={onDownvote ? () => onDownvote(item.id) : undefined}
            onShare={onShare ? () => onShare(item.id) : undefined}
          />
        </View>

        <View style={styles.separator} />
      </View>
    </View>
  );
}

export const FeedCard = React.memo(FeedCardInner, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.userVote === next.userVote &&
    prev.isVideoActive === next.isVideoActive &&
    prev.isFollowing === next.isFollowing &&
    prev.item.upvote_count === next.item.upvote_count &&
    prev.item.downvote_count === next.item.downvote_count &&
    prev.item.view_count === next.item.view_count &&
    prev.item.comment_count === next.item.comment_count
  );
});
