import { useState, useCallback } from 'react';
import { View, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme/colors';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { getYouTubeThumbnail } from '@/constants/feedHelpers';
import { sanitizeYoutubeId } from '@/utils/sanitizeYoutubeId';
import { shareYouTubeVideo } from '@/utils/youtubeNavigation';
import { styles } from './CustomYouTubePlayer.styles';

export interface CustomYouTubePlayerProps {
  /** YouTube video ID */
  youtubeId: string;
  /** Optional custom thumbnail URL — falls back to maxresdefault */
  thumbnailUrl?: string | null;
  /**
   * @contract Controls whether the YouTube player iframe is mounted.
   * When false: renders only a static thumbnail + play button (no player loaded).
   * When true: mounts the YouTube player with thumbnail overlay.
   * This is critical for feed performance — prevents loading iframes for off-screen videos.
   */
  isActive?: boolean;
  /** Whether the video should auto-play when isActive becomes true */
  autoPlay?: boolean;
  /** Whether to start muted (e.g. feed videos) */
  autoMute?: boolean;
  /** Called when the user taps the thumbnail play button (only fires when isActive=false) */
  onPlay?: () => void;
  /** Called when playback state changes */
  onStateChange?: (state: string) => void;
  /** Container corner radius — defaults to 12, pass 0 for edge-to-edge contexts */
  borderRadius?: number;
}

/**
 * @contract Single source of truth for all YouTube video rendering in the app.
 * Three modes:
 * 1. isActive=false: static thumbnail + play button. Tapping calls onPlay.
 * 2. isActive=true, hasStarted=false: YouTube player loading under custom thumbnail overlay.
 *    pointerEvents="none" lets taps pass through to YouTube's native player.
 * 3. isActive=true, hasStarted=true: YouTube player visible, overlay dismissed.
 *
 * @invariant hasStarted only flips to true — overlay never returns once playback begins.
 */
export function CustomYouTubePlayer({
  youtubeId,
  thumbnailUrl,
  isActive = true,
  autoPlay = false,
  autoMute = false,
  onPlay,
  onStateChange,
  borderRadius: borderRadiusProp = 12,
}: CustomYouTubePlayerProps) {
  const { t } = useTranslation();
  const safeId = sanitizeYoutubeId(youtubeId);
  const containerStyle = [styles.container, { borderRadius: borderRadiusProp }];

  /** @sideeffect once hasStarted flips to true, thumbnail overlay never returns */
  const [hasStarted, setHasStarted] = useState(false);
  const [playerHeight, setPlayerHeight] = useState(0);

  /** @nullable thumbnailUrl — falls back to YouTube's maxresdefault thumbnail */
  const thumb = thumbnailUrl ?? getYouTubeThumbnail(safeId || youtubeId, 'maxresdefault');

  const handleStateChange = useCallback(
    (state: string) => {
      if (state === 'playing') {
        setHasStarted(true);
      }
      onStateChange?.(state);
    },
    [onStateChange],
  );

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) setPlayerHeight(Math.round(height));
  }, []);

  const handleShare = useCallback(() => {
    if (safeId) shareYouTubeVideo(safeId);
  }, [safeId]);

  // Invalid / empty ID → placeholder image
  if (!safeId) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri: PLACEHOLDER_POSTER }} style={styles.thumbnail} contentFit="cover" />
      </View>
    );
  }

  // Idle mode — static thumbnail + play button, no player loaded
  if (!isActive) {
    return (
      <View style={containerStyle}>
        <TouchableOpacity
          style={styles.thumbnailContainer}
          onPress={onPlay}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('common.playVideo')}
        >
          <Image
            source={{ uri: thumb || PLACEHOLDER_POSTER }}
            style={styles.thumbnail}
            contentFit="cover"
          />
          <View style={styles.playOverlay}>
            <View style={styles.playCircle}>
              <Ionicons name="play" size={28} color={colors.white} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Active mode — YouTube player + thumbnail overlay until playback starts
  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={styles.playerWrapper}>
        {playerHeight > 0 && (
          <YoutubePlayer
            height={playerHeight}
            videoId={safeId}
            play={autoPlay}
            mute={autoMute}
            onChangeState={handleStateChange}
            initialPlayerParams={{
              modestbranding: true,
              rel: false,
              iv_load_policy: 3,
              preventFullScreen: false,
            }}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              scrollEnabled: false,
              bounces: false,
            }}
          />
        )}
      </View>

      {/* @edge Thumbnail overlay hides YouTube's red play button for a cleaner look */}
      {/* pointerEvents="none" lets taps pass through to YouTube's native player underneath */}
      {!hasStarted && (
        <View style={styles.thumbnailContainer} pointerEvents="none">
          <Image
            source={{ uri: thumb || PLACEHOLDER_POSTER }}
            style={styles.thumbnail}
            contentFit="cover"
          />
          <View style={styles.playOverlay}>
            <View style={styles.playCircle}>
              <Ionicons name="play" size={28} color={colors.white} />
            </View>
          </View>
        </View>
      )}

      {/* Share button overlay — always visible in active mode */}
      <View style={styles.shareOverlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.shareHitArea}
          onPress={handleShare}
          accessibilityLabel={t('common.shareVideo')}
        />
      </View>
    </View>
  );
}
