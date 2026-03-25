import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { getYouTubeThumbnail } from '@/constants/feedHelpers';
import { useTranslation } from 'react-i18next';
import type { MovieVideo, MoviePoster } from '@/types';
import { createStyles } from '@/styles/movieDetail.styles';

/** @contract Clickable card showing featured thumbnail + video/photo counts; navigates to media page */
export interface MediaSummaryCardProps {
  videos: MovieVideo[];
  posters: MoviePoster[];
  onExploreMedia: () => void;
}

export function MediaSummaryCard({ videos, posters, onExploreMedia }: MediaSummaryCardProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);

  /** @invariant Featured video priority: trailer > teaser > first video > null (no thumbnail) */
  const featured =
    videos.find((v) => v.video_type === 'trailer') ??
    videos.find((v) => v.video_type === 'teaser') ??
    videos[0] ??
    null;

  const parts: string[] = [];
  if (videos.length > 0)
    parts.push(
      `${videos.length} ${videos.length !== 1 ? t('movieDetail.videos') : t('movieDetail.video')}`,
    );
  /** @contract Show separate poster/backdrop counts instead of a single "N Photos" count */
  // @edge: single-pass reduce avoids iterating posters twice for two counts
  const { posterCount, backdropCount } = posters.reduce(
    (acc, p) => {
      if (p.image_type === 'poster') acc.posterCount++;
      else if (p.image_type === 'backdrop')
        /* istanbul ignore next -- image_type is always poster or backdrop */ acc.backdropCount++;
      return acc;
    },
    { posterCount: 0, backdropCount: 0 },
  );
  const photoParts: string[] = [];
  if (posterCount > 0)
    photoParts.push(
      `${posterCount} ${posterCount !== 1 ? t('movieDetail.posters') : t('movieDetail.poster')}`,
    );
  if (backdropCount > 0)
    photoParts.push(
      `${backdropCount} ${backdropCount !== 1 ? t('movieDetail.backdrops') : t('movieDetail.backdrop')}`,
    );
  if (photoParts.length > 0) parts.push(photoParts.join(' · '));
  const summaryText = parts.join(' · ');

  return (
    <TouchableOpacity
      style={styles.mediaSummaryCard}
      onPress={onExploreMedia}
      activeOpacity={0.85}
      accessibilityLabel={`${summaryText} — Explore all media`}
    >
      {/** @nullable featured is null when no videos exist — thumbnail section hidden entirely */}
      {featured && (
        <View style={styles.mediaSummaryThumb}>
          <Image
            /** @boundary YouTube thumbnail URL constructed from youtube_id; falls back to placeholder */
            source={{
              uri: featured.youtube_id
                ? getYouTubeThumbnail(featured.youtube_id, 'mqdefault')
                : PLACEHOLDER_POSTER,
            }}
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
          <Text style={styles.mediaSummaryCtaText}>{t('movieDetail.exploreAllMedia')}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.red400} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
