import { useState, useMemo, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { MediaVideoCard } from '@/components/movie/media/MediaVideoCard';
import type { MovieVideo } from '@/types';
import { createStyles } from '@/styles/movieMedia.styles';

interface VideoGroup {
  label: string;
  videos: MovieVideo[];
}

export interface MediaVideosTabProps {
  videosByType: VideoGroup[];
  activeCategory: string;
}

const ALL_CATEGORY = 'All';

export function MediaVideosTab({ videosByType, activeCategory }: MediaVideosTabProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    setPlayingVideoId(null);
  }, [activeCategory]);

  const handlePlay = (id: string) => {
    setPlayingVideoId((prev) => (prev === id ? null : id));
  };

  const filteredGroups = useMemo(() => {
    if (activeCategory === ALL_CATEGORY) return videosByType;
    return videosByType.filter((g) => g.label === activeCategory);
  }, [activeCategory, videosByType]);

  if (filteredGroups.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No videos available yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.videosTab}>
      {filteredGroups.map((group) => (
        <View key={group.label} style={styles.videoSection}>
          {activeCategory === ALL_CATEGORY && (
            <Text style={styles.sectionTitle}>{group.label}s</Text>
          )}
          <View style={styles.videoList}>
            {group.videos.map((video) => (
              <MediaVideoCard
                key={video.id}
                video={video}
                isPlaying={playingVideoId === video.id}
                onPlay={handlePlay}
                theme={theme}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
