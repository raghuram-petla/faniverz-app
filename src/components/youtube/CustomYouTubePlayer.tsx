import { useCallback, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/theme';
import { buildYouTubePlayerHtml } from '@/utils/buildYouTubePlayerHtml';
import { shareYouTubeVideo } from '@/utils/youtubeNavigation';
import { WEBVIEW_BASE_URL } from '@/constants/webview';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { createCustomPlayerStyles } from './CustomYouTubePlayer.styles';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

export interface CustomYouTubePlayerProps {
  youtubeId: string;
}

export function CustomYouTubePlayer({ youtubeId }: CustomYouTubePlayerProps) {
  const { theme, colors } = useTheme();
  const styles = createCustomPlayerStyles(theme);
  const { state, actions, webViewRef, handleMessage } = useYouTubePlayer();
  const [trackWidth, setTrackWidth] = useState(0);

  const isPlaying = state.playerState === 'playing';
  const isBuffering = state.playerState === 'buffering';
  const progress = state.duration > 0 ? state.currentTime / state.duration : 0;

  const onNavRequest = useCallback((request: ShouldStartLoadRequest) => {
    const { url } = request;
    return (
      url === 'about:blank' ||
      url.includes('youtube.com/iframe_api') ||
      url.includes('youtube.com/s/player') ||
      url.includes('youtube.com/embed') ||
      url.includes('ytimg.com') ||
      url.startsWith('about:')
    );
  }, []);

  const handleSeek = useCallback(
    (locationX: number) => {
      if (trackWidth <= 0 || state.duration <= 0) return;
      const ratio = Math.max(0, Math.min(1, locationX / trackWidth));
      actions.seek(ratio * state.duration);
    },
    [trackWidth, state.duration, actions],
  );

  const handleShare = useCallback(() => shareYouTubeVideo(youtubeId), [youtubeId]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: buildYouTubePlayerHtml(youtubeId), baseUrl: WEBVIEW_BASE_URL }}
        style={styles.webview}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={onNavRequest}
      />

      {/* Loading overlay */}
      {!state.isReady ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.red600} />
        </View>
      ) : null}

      {/* Controls overlay */}
      {state.isReady ? (
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Center play/pause */}
          <TouchableOpacity
            style={styles.centerBtn}
            onPress={actions.togglePlayPause}
            activeOpacity={0.7}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color={colors.white}
                style={isPlaying ? undefined : styles.centerIcon}
              />
            )}
          </TouchableOpacity>

          {/* Bottom bar */}
          <View style={styles.bottomBar} pointerEvents="box-none">
            {/* Share */}
            <TouchableOpacity
              style={styles.bottomBtn}
              onPress={handleShare}
              accessibilityLabel="Share video"
            >
              <Ionicons name="share-outline" size={20} color={colors.white} />
            </TouchableOpacity>

            {/* Seek bar */}
            <Pressable
              style={styles.seekTrack}
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              onPress={(e) => handleSeek(e.nativeEvent.locationX)}
              accessibilityLabel="Seek"
              accessibilityRole="adjustable"
            >
              <View style={styles.seekTrackBg} />
              <View style={[styles.seekTrackFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.seekThumb, { left: Math.max(0, progress * trackWidth - 6) }]} />
            </Pressable>

            {/* Fullscreen */}
            <TouchableOpacity
              style={styles.bottomBtn}
              onPress={() => {
                webViewRef.current?.injectJavaScript(
                  'var f=player.getIframe();if(f.requestFullscreen)f.requestFullscreen();true;',
                );
              }}
              accessibilityLabel="Fullscreen"
            >
              <Ionicons name="expand-outline" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}
