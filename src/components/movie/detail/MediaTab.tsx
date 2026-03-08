import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { MovieVideo, MoviePoster } from '@/types';
import { createStyles } from '@/styles/movieDetail.styles';
import { getImageUrl } from '@shared/imageUrl';

interface VideoGroup {
  label: string;
  videos: MovieVideo[];
}

interface MediaTabProps {
  videosByType: VideoGroup[];
  posters: MoviePoster[];
  onSelectPoster: (poster: MoviePoster) => void;
}

export function MediaTab({ videosByType, posters, onSelectPoster }: MediaTabProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.mediaTab}>
      {videosByType.map((group) => (
        <View key={group.label} style={styles.mediaSection}>
          <Text style={styles.mediaSectionTitle}>{group.label}s</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.videoRow}>
              {group.videos.map((video: MovieVideo) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  onPress={() =>
                    Linking.openURL(`https://www.youtube.com/watch?v=${video.youtube_id}`)
                  }
                  accessibilityLabel={video.title}
                >
                  <View style={styles.videoThumbnailWrapper}>
                    <Image
                      source={{
                        uri: `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`,
                      }}
                      style={styles.videoThumbnail}
                      contentFit="cover"
                    />
                    <View style={styles.playOverlay}>
                      <Ionicons name="play-circle" size={36} color={colors.white} />
                    </View>
                    {video.duration && (
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{video.duration}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      ))}

      {posters.length > 0 && (
        <View style={styles.mediaSection}>
          <Text style={styles.mediaSectionTitle}>Posters</Text>
          <View style={styles.posterGrid}>
            {posters.map((poster: MoviePoster) => (
              <TouchableOpacity
                key={poster.id}
                style={styles.posterCard}
                onPress={() => onSelectPoster(poster)}
                activeOpacity={0.8}
                accessibilityLabel={`View ${poster.title}`}
              >
                <Image
                  source={{ uri: getImageUrl(poster.image_url, 'md') ?? undefined }}
                  style={styles.posterImage}
                  contentFit="cover"
                />
                {poster.is_main && (
                  <View style={styles.mainPosterBadge}>
                    <Ionicons name="star" size={10} color={colors.yellow400} />
                    <Text style={styles.mainPosterText}>Main</Text>
                  </View>
                )}
                <Text style={styles.posterTitle} numberOfLines={1}>
                  {poster.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
