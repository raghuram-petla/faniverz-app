import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { FeedContentBadge } from './FeedContentBadge';
import { FeedVideoPlayer } from './FeedVideoPlayer';
import { VoteButtons } from './VoteButtons';
import { ImageViewerModal } from '@/components/common/ImageViewerModal';
import { formatRelativeTime, getFeedTypeLabel } from '@/constants/feedHelpers';
import { createFeedCardStyles } from '@/styles/tabs/feed.styles';
import type { NewsFeedItem } from '@shared/types';

export interface FeedCardProps {
  item: NewsFeedItem;
  onPress: (item: NewsFeedItem) => void;
  userVote?: 'up' | 'down' | null;
  onUpvote?: (itemId: string) => void;
  onDownvote?: (itemId: string) => void;
  isVideoActive?: boolean;
  onVideoLayout?: (id: string, y: number, height: number) => void;
}

function FeedCardInner({
  item,
  onPress,
  userVote,
  onUpvote,
  onDownvote,
  isVideoActive,
  onVideoLayout,
}: FeedCardProps) {
  const { theme, colors } = useTheme();
  const styles = createFeedCardStyles(theme);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const hasVideo = !!item.youtube_id;
  const hasThumbnail = !!item.thumbnail_url;
  const isPosterImage = hasThumbnail && !hasVideo;
  const movieName = item.movie?.title;
  const label = getFeedTypeLabel(item.content_type);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (onVideoLayout) {
        const { y, height } = e.nativeEvent.layout;
        onVideoLayout(item.id, y, height);
      }
    },
    [item.id, onVideoLayout],
  );

  return (
    <View style={styles.post} onLayout={hasVideo ? handleLayout : undefined}>
      {item.is_pinned ? (
        <View style={styles.pinnedRow}>
          <Ionicons name="pin" size={12} color={theme.textTertiary} />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      ) : null}

      {!item.is_pinned && item.is_featured ? (
        <View style={styles.featuredRow}>
          <Ionicons name="star" size={12} color={colors.yellow400} />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${item.title}`}
      >
        {/* Header: badge + movie + timestamp */}
        <View style={styles.headerRow}>
          <FeedContentBadge contentType={item.content_type} />
          {movieName ? (
            <>
              <Text style={styles.movieName} numberOfLines={1}>
                {movieName}
              </Text>
              <Text style={styles.dot}>·</Text>
            </>
          ) : null}
          <Text style={styles.timestamp}>{formatRelativeTime(item.published_at)}</Text>
        </View>

        {/* Title */}
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
            onPress={() => setViewerImage(item.thumbnail_url!)}
            accessibilityLabel={`View ${item.title} poster`}
          >
            <View style={styles.posterMediaContainer}>
              <Image
                source={{ uri: item.thumbnail_url! }}
                style={styles.media}
                contentFit="cover"
              />
            </View>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      <ImageViewerModal imageUrl={viewerImage} onClose={() => setViewerImage(null)} />

      {/* Action bar */}
      {onUpvote && onDownvote ? (
        <View style={styles.actionBar}>
          <VoteButtons
            upvoteCount={item.upvote_count}
            downvoteCount={item.downvote_count}
            userVote={userVote ?? null}
            onUpvote={() => onUpvote(item.id)}
            onDownvote={() => onDownvote(item.id)}
          />
        </View>
      ) : null}

      <View style={styles.separator} />
    </View>
  );
}

export const FeedCard = React.memo(FeedCardInner, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.userVote === next.userVote &&
    prev.isVideoActive === next.isVideoActive &&
    prev.item.upvote_count === next.item.upvote_count &&
    prev.item.downvote_count === next.item.downvote_count
  );
});
