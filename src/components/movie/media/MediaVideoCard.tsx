import { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { CustomYouTubePlayer } from '@/components/youtube/CustomYouTubePlayer';
import { colors } from '@/theme/colors';
import type { MovieVideo } from '@/types';
import type { SemanticTheme } from '@shared/themes';

const SCREEN_WIDTH = Dimensions.get('window').width;
/** @invariant Card spans full width minus 16px horizontal padding on each side */
const CARD_WIDTH = SCREEN_WIDTH - 32;
/** @coupling 16:9 aspect ratio matches YouTube video thumbnails */
const THUMB_HEIGHT = Math.round(CARD_WIDTH * (9 / 16));

/**
 * @contract Two render modes controlled by isPlaying, both delegated to CustomYouTubePlayer.
 * Only one card plays at a time — parent manages playingVideoId state.
 */
export interface MediaVideoCardProps {
  video: MovieVideo;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  /** @coupling Theme passed directly to avoid hook call inside list item */
  theme: SemanticTheme;
}

/** @sideeffect When isPlaying=true, player is mounted and auto-plays — unmounting pauses the video */
export function MediaVideoCard({ video, isPlaying, onPlay, theme }: MediaVideoCardProps) {
  const cardStyles = createCardStyles(theme);

  const handlePlay = useCallback(() => onPlay(video.id), [onPlay, video.id]);

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.playerWrapper}>
        <CustomYouTubePlayer
          youtubeId={video.youtube_id}
          isActive={isPlaying}
          autoPlay={isPlaying}
          mountShellWhenIdle
          onPlay={handlePlay}
        />
      </View>
      <Text style={cardStyles.title} numberOfLines={2}>
        {video.title}
      </Text>
    </View>
  );
}

const createCardStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    card: { gap: 8 },
    playerWrapper: {
      width: CARD_WIDTH,
      height: THUMB_HEIGHT,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.black,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: t.textPrimary,
    },
  });
