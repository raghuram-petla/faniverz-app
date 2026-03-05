import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { FeedContentBadge } from './FeedContentBadge';
import { formatRelativeTime } from '@/constants/feedHelpers';
import { createFeaturedCardStyles } from '@/styles/tabs/feed.styles';
import type { NewsFeedItem } from '@shared/types';

export interface FeaturedFeedCardProps {
  item: NewsFeedItem;
  onPress: (item: NewsFeedItem) => void;
}

export function FeaturedFeedCard({ item, onPress }: FeaturedFeedCardProps) {
  const { theme, colors } = useTheme();
  const styles = createFeaturedCardStyles(theme);
  const hasVideo = !!item.youtube_id;
  const hasThumbnail = !!item.thumbnail_url;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Featured: ${item.title}`}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnail}>
        {hasThumbnail ? (
          <Image source={{ uri: item.thumbnail_url! }} style={styles.thumbnailImage} />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
        )}

        {/* Play overlay */}
        {hasVideo ? (
          <View style={styles.playBtn}>
            <Ionicons name="play" size={28} color={colors.white} style={styles.playIcon} />
          </View>
        ) : null}

        {/* Featured badge */}
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={10} color={colors.white} />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.meta}>
        <View style={styles.badgeRow}>
          <FeedContentBadge contentType={item.content_type} />
          {item.duration ? <Text style={styles.duration}>{item.duration}</Text> : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.bottomRow}>
          {item.movie ? (
            <Text style={styles.movieTitle} numberOfLines={1}>
              {item.movie.title}
            </Text>
          ) : null}
          <Text style={styles.timestamp}>{formatRelativeTime(item.published_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
