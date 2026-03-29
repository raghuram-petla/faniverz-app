import { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { CustomYouTubePlayer } from '@/components/youtube/CustomYouTubePlayer';
import {
  getCategoryColor,
  getCategoryLabel,
  getCategoryIconName,
  formatViews,
} from '@/constants/surpriseHelpers';
import { getYouTubeThumbnail } from '@/constants/feedHelpers';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { useTranslation } from 'react-i18next';
import type { SurpriseContent } from '@/types';

/** @edge fallback video ID used when item.youtube_id is null — must be a valid public YouTube video
 * @invariant If this video is removed from YouTube, all items without youtube_id will show a broken player */
const FALLBACK_VIDEO_ID = 'roYRXbhxhlM';

interface FeaturedVideoCardProps {
  item: SurpriseContent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

/**
 * @contract Featured video card in Surprise tab.
 * Delegates all video rendering to CustomYouTubePlayer (single source of truth).
 * Thumbnail → player transition is controlled via isActive + onPlay.
 */
export function FeaturedVideoCard({ item, styles }: FeaturedVideoCardProps) {
  const { t } = useTranslation();
  /** @nullable youtube_id — uses FALLBACK_VIDEO_ID when null */
  const videoId = item.youtube_id ?? FALLBACK_VIDEO_ID;
  const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId, 'maxresdefault') : PLACEHOLDER_POSTER;
  const catColor = getCategoryColor(item.category);
  const catLabel = getCategoryLabel(item.category);
  const iconName = getCategoryIconName(item.category);
  /** @sideeffect once activated, the player is mounted permanently for this render cycle */
  const [activated, setActivated] = useState(false);

  const handlePlay = useCallback(() => setActivated(true), []);

  return (
    <View style={styles.featuredContainer}>
      <View style={styles.featuredVideoBox}>
        <CustomYouTubePlayer
          youtubeId={videoId}
          thumbnailUrl={thumbnailUrl}
          isActive={activated}
          autoPlay={activated}
          mountShellWhenIdle
          onPlay={handlePlay}
        />
      </View>

      <View style={styles.featuredMeta}>
        <View style={styles.featuredBadgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: catColor }]}>
            <Ionicons name={iconName} size={11} color={colors.white} />
            <Text style={styles.categoryBadgeText}>{catLabel.toUpperCase()}</Text>
          </View>
          <Text style={styles.featuredViews}>
            {formatViews(item.views)} {t('common.views')}
          </Text>
        </View>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.featuredDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
