import { useState, useMemo, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { MediaVideoCard } from '@/components/movie/media/MediaVideoCard';
import type { MovieVideo } from '@/types';
import { createStyles } from '@/styles/movieMedia.styles';

interface VideoGroup {
  label: string;
  videos: MovieVideo[];
}

/** @contract Renders grouped video cards filtered by category; only one video plays at a time */
export interface MediaVideosTabProps {
  /** @assumes videosByType groups are pre-sorted by type (Trailer, Teaser, etc.) */
  videosByType: VideoGroup[];
  activeCategory: string;
}

const ALL_CATEGORY = 'All';

export function MediaVideosTab({ videosByType, activeCategory }: MediaVideosTabProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  /** @sideeffect Stops any playing video when user switches category filter */
  useEffect(() => {
    setPlayingVideoId(null);
  }, [activeCategory]);

  /** @invariant Toggling the same video ID pauses it; ensures only one video plays at a time */
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
        <Text style={styles.emptyStateText}>
          {activeCategory === ALL_CATEGORY
            ? t('movieDetail.noVideosYet')
            : t('movieDetail.noVideosInCategory')}
        </Text>
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
