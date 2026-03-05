import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { FeedContentBadge } from './FeedContentBadge';
import { VoteButtons } from './VoteButtons';
import { formatRelativeTime, CARD_GRADIENTS } from '@/constants/feedHelpers';
import { createFeedCardStyles } from '@/styles/tabs/feed.styles';
import type { NewsFeedItem } from '@shared/types';

export interface FeedCardProps {
  item: NewsFeedItem;
  index: number;
  onPress: (item: NewsFeedItem) => void;
  userVote?: 'up' | 'down' | null;
  onUpvote?: (itemId: string) => void;
  onDownvote?: (itemId: string) => void;
}

export function FeedCard({ item, index, onPress, userVote, onUpvote, onDownvote }: FeedCardProps) {
  const { theme, colors } = useTheme();
  const styles = createFeedCardStyles(theme);
  const bgColor = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const hasVideo = !!item.youtube_id;
  const hasThumbnail = !!item.thumbnail_url;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      {/* Thumbnail */}
      <View style={[styles.thumbnail, { backgroundColor: bgColor }]}>
        {hasThumbnail ? (
          <Image source={{ uri: item.thumbnail_url! }} style={styles.thumbnailImage} />
        ) : null}

        {hasVideo ? (
          <View style={styles.playBtn}>
            <Ionicons name="play" size={20} color={colors.white} style={styles.playIcon} />
          </View>
        ) : null}

        <View style={styles.badgeContainer}>
          <FeedContentBadge contentType={item.content_type} size="small" />
        </View>

        {item.duration ? (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        ) : null}

        {item.is_pinned ? (
          <View style={styles.pinBadge}>
            <Ionicons name="pin" size={10} color={colors.white} />
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          {item.movie ? (
            <Text style={styles.movieTitle} numberOfLines={1}>
              {item.movie.title}
            </Text>
          ) : null}
          <Text style={styles.timestamp}>{formatRelativeTime(item.published_at)}</Text>
        </View>
        {onUpvote && onDownvote ? (
          <VoteButtons
            upvoteCount={item.upvote_count}
            downvoteCount={item.downvote_count}
            userVote={userVote ?? null}
            onUpvote={() => onUpvote(item.id)}
            onDownvote={() => onDownvote(item.id)}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
