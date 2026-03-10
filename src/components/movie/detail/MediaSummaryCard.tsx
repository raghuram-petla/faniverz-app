import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { MovieVideo, MoviePoster } from '@/types';
import { createStyles } from '@/styles/movieDetail.styles';

export interface MediaSummaryCardProps {
  videos: MovieVideo[];
  posters: MoviePoster[];
  onExploreMedia: () => void;
}

export function MediaSummaryCard({ videos, posters, onExploreMedia }: MediaSummaryCardProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);

  const featured =
    videos.find((v) => v.video_type === 'trailer') ??
    videos.find((v) => v.video_type === 'teaser') ??
    videos[0] ??
    null;

  const parts: string[] = [];
  if (videos.length > 0) parts.push(`${videos.length} Video${videos.length !== 1 ? 's' : ''}`);
  if (posters.length > 0) parts.push(`${posters.length} Photo${posters.length !== 1 ? 's' : ''}`);
  const summaryText = parts.join(' · ');

  return (
    <TouchableOpacity
      style={styles.mediaSummaryCard}
      onPress={onExploreMedia}
      activeOpacity={0.85}
      accessibilityLabel={`${summaryText} — Explore all media`}
    >
      {featured && (
        <View style={styles.mediaSummaryThumb}>
          <Image
            source={{ uri: `https://img.youtube.com/vi/${featured.youtube_id}/mqdefault.jpg` }}
            style={styles.mediaSummaryImage}
            contentFit="cover"
          />
          <View style={styles.mediaSummaryPlay}>
            <Ionicons name="play-circle" size={48} color={colors.white} />
          </View>
        </View>
      )}
      <View style={styles.mediaSummaryInfo}>
        <Text style={styles.mediaSummaryText}>{summaryText}</Text>
        <View style={styles.mediaSummaryCtaRow}>
          <Text style={styles.mediaSummaryCtaText}>Explore All Media</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.red400} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
