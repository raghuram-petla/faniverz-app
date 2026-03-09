import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { MediaFilterPills } from './MediaFilterPills';
import { MediaVideoCard } from './MediaVideoCard';
import type { MovieVideo, MoviePoster } from '@/types';
import { createStyles } from '@/styles/movieDetail.styles';
import { getImageUrl } from '@shared/imageUrl';

interface VideoGroup {
  label: string;
  videos: MovieVideo[];
}

export interface MediaTabProps {
  videosByType: VideoGroup[];
  posters: MoviePoster[];
  onSelectPoster: (poster: MoviePoster) => void;
}

const ALL_CATEGORY = 'All';
const POSTERS_CATEGORY = 'Posters';

export function MediaTab({ videosByType, posters, onSelectPoster }: MediaTabProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = [ALL_CATEGORY, ...videosByType.map((g) => g.label)];
    if (posters.length > 0) cats.push(POSTERS_CATEGORY);
    return cats;
  }, [videosByType, posters.length]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setPlayingVideoId(null);
  };

  const handlePlay = (id: string) => {
    setPlayingVideoId((prev) => (prev === id ? null : id));
  };

  const filteredVideos = useMemo(() => {
    if (activeCategory === ALL_CATEGORY || activeCategory === POSTERS_CATEGORY) {
      return videosByType;
    }
    return videosByType.filter((g) => g.label === activeCategory);
  }, [activeCategory, videosByType]);

  const showPosters =
    posters.length > 0 && (activeCategory === ALL_CATEGORY || activeCategory === POSTERS_CATEGORY);

  return (
    <View style={styles.mediaTab}>
      <MediaFilterPills
        categories={categories}
        active={activeCategory}
        onSelect={handleCategoryChange}
        theme={theme}
      />

      {activeCategory !== POSTERS_CATEGORY &&
        filteredVideos.map((group) => (
          <View key={group.label} style={styles.mediaSection}>
            {activeCategory === ALL_CATEGORY && (
              <Text style={styles.mediaSectionTitle}>{group.label}s</Text>
            )}
            <View style={styles.mediaVideoList}>
              {group.videos.map((video: MovieVideo) => (
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

      {showPosters && (
        <View style={styles.mediaSection}>
          {activeCategory === ALL_CATEGORY && <Text style={styles.mediaSectionTitle}>Posters</Text>}
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
