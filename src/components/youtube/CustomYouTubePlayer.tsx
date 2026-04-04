import { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme/colors';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { getYouTubeThumbnail } from '@/constants/feedHelpers';
import { sanitizeYoutubeId } from '@/utils/sanitizeYoutubeId';
import { shareYouTubeVideo } from '@/utils/youtubeNavigation';
import { styles } from './CustomYouTubePlayer.styles';
import { InlineYouTubeWebView } from './InlineYouTubeWebView';

export interface CustomYouTubePlayerProps {
  youtubeId: string;
  thumbnailUrl?: string | null;
  isActive?: boolean;
  autoPlay?: boolean;
  autoMute?: boolean;
  onPlay?: () => void;
  onStateChange?: (state: string) => void;
  borderRadius?: number;
  mountShellWhenIdle?: boolean;
}

type PlayingPlayerListener = (instanceId: number | null) => void;

// @invariant Module-level singleton ensures only one YouTube player produces audio at a time across the entire app.
// @edge These globals persist across React navigation — if the component tree unmounts without cleanup, activePlayingInstanceId may reference a dead instance.
const playingPlayerListeners = new Set<PlayingPlayerListener>();
let activePlayingInstanceId: number | null = null;
let nextPlayingInstanceId = 0;

const publishPlayingInstance = (instanceId: number | null) => {
  if (activePlayingInstanceId === instanceId) {
    return;
  }
  activePlayingInstanceId = instanceId;
  playingPlayerListeners.forEach((listener) => listener(instanceId));
};

/**
 * @contract Single source of truth for YouTube rendering across feed, movie media, and surprise cards.
 * When mountShellWhenIdle=false it falls back to a cheap native thumbnail button.
 * When mountShellWhenIdle=true it mounts the interactive WebView shell early so the first tap happens inside iOS WebView content.
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
  mountShellWhenIdle = false,
}: CustomYouTubePlayerProps) {
  const { t } = useTranslation();
  const safeId = sanitizeYoutubeId(youtubeId);
  /** @nullable thumbnailUrl falls back to YouTube maxresdefault when callers do not provide a custom asset. */
  const thumb = thumbnailUrl ?? getYouTubeThumbnail(safeId || youtubeId, 'maxresdefault');
  const [hasStarted, setHasStarted] = useState(false);
  const [pauseToken, setPauseToken] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const hasStartedRef = useRef(false);
  const instanceIdRef = useRef<number | null>(null);
  const containerStyle = [styles.container, { borderRadius: borderRadiusProp }];
  const shouldMountShell = isActive || mountShellWhenIdle;
  if (instanceIdRef.current === null) {
    instanceIdRef.current = ++nextPlayingInstanceId;
  }
  const instanceId = instanceIdRef.current;

  useEffect(() => {
    hasStartedRef.current = hasStarted;
  }, [hasStarted]);

  useEffect(() => {
    setHasStarted(false);
    setPauseToken(0);
    setResetToken(0);
  }, [safeId]);

  useEffect(() => {
    // @sync every mounted shell listens for the current playing instance so a newly started video can pause older ones immediately.
    const handlePlayingInstance = (playingInstanceId: number | null) => {
      if (playingInstanceId !== null && playingInstanceId !== instanceId && hasStartedRef.current) {
        setPauseToken((prev) => prev + 1);
      }
    };
    playingPlayerListeners.add(handlePlayingInstance);
    return () => {
      playingPlayerListeners.delete(handlePlayingInstance);
      if (activePlayingInstanceId === instanceId) {
        publishPlayingInstance(null);
      }
    };
  }, [instanceId]);

  useEffect(() => {
    if (!isActive && hasStarted && mountShellWhenIdle) {
      setHasStarted(false);
      setResetToken((prev) => prev + 1);
    }
  }, [hasStarted, isActive, mountShellWhenIdle]);

  const handleShellPlay = useCallback(() => {
    setHasStarted(true);
    publishPlayingInstance(instanceId);
    onPlay?.();
  }, [instanceId, onPlay]);

  const handleShellStateChange = useCallback(
    (state: string) => {
      if (state === 'playing') {
        setHasStarted(true);
        publishPlayingInstance(instanceId);
      }
      if (state === 'paused' && activePlayingInstanceId === instanceId) {
        publishPlayingInstance(null);
      }
      if (state === 'ended' || state === 'idle') {
        setHasStarted(false);
        if (activePlayingInstanceId === instanceId) {
          publishPlayingInstance(null);
        }
      }
      onStateChange?.(state);
    },
    [instanceId, onStateChange],
  );

  const handleShare = useCallback(() => {
    /* istanbul ignore else -- handleShare is only reachable when safeId is truthy (early return above) */
    if (safeId) {
      shareYouTubeVideo(safeId);
    }
  }, [safeId]);

  if (!safeId) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri: PLACEHOLDER_POSTER }} style={styles.thumbnail} contentFit="cover" />
      </View>
    );
  }

  if (!shouldMountShell) {
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
            source={{ uri: thumb || /* istanbul ignore next */ PLACEHOLDER_POSTER }}
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

  return (
    <View style={containerStyle}>
      <View style={styles.playerWrapper}>
        <InlineYouTubeWebView
          videoId={safeId}
          thumbnailUrl={thumb || /* istanbul ignore next */ PLACEHOLDER_POSTER}
          autoPlay={isActive && autoPlay}
          muted={autoMute}
          pauseToken={pauseToken}
          resetToken={resetToken}
          onPlayPress={handleShellPlay}
          onStateChange={handleShellStateChange}
        />
      </View>

      {/* @edge share remains native so we keep the existing app-wide YouTube sharing path without custom DOM wiring. */}
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
