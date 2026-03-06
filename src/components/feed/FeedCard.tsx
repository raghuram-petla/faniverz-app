import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { FeedContentBadge } from './FeedContentBadge';
import { VoteButtons } from './VoteButtons';
import { formatRelativeTime, getFeedTypeLabel } from '@/constants/feedHelpers';
import { createFeedCardStyles } from '@/styles/tabs/feed.styles';
import type { NewsFeedItem } from '@shared/types';

export interface FeedCardProps {
  item: NewsFeedItem;
  onPress: (item: NewsFeedItem) => void;
  userVote?: 'up' | 'down' | null;
  onUpvote?: (itemId: string) => void;
  onDownvote?: (itemId: string) => void;
}

export function FeedCard({ item, onPress, userVote, onUpvote, onDownvote }: FeedCardProps) {
  const { theme, colors } = useTheme();
  const styles = createFeedCardStyles(theme);
  const hasVideo = !!item.youtube_id;
  const hasThumbnail = !!item.thumbnail_url;
  const movieName = item.movie?.title;
  const label = getFeedTypeLabel(item.content_type);

  return (
    <View style={styles.post}>
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

        {/* Media */}
        {hasThumbnail ? (
          <View style={styles.mediaContainer}>
            <Image source={{ uri: item.thumbnail_url! }} style={styles.media} />
            {hasVideo ? (
              <View style={styles.playBtn}>
                <Ionicons name="play" size={24} color={colors.white} style={styles.playIcon} />
              </View>
            ) : null}
            {item.duration ? (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{item.duration}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>

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
