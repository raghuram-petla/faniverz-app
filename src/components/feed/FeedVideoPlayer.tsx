import { useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import {
  buildYouTubeEmbedHtml,
  shareYouTubeVideo,
  handleYouTubeNavigation,
  handleYouTubeOpenWindow,
} from '@/utils/youtubeNavigation';
import { createFeedCardStyles } from '@/styles/tabs/feed.styles';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

export interface FeedVideoPlayerProps {
  youtubeId: string;
  thumbnailUrl: string | null;
  duration: string | null;
  isActive: boolean;
}

export function FeedVideoPlayer({
  youtubeId,
  thumbnailUrl,
  duration,
  isActive,
}: FeedVideoPlayerProps) {
  const { theme, colors } = useTheme();
  const styles = createFeedCardStyles(theme);
  const thumb = thumbnailUrl ?? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

  const onNavRequest = useCallback(
    (request: ShouldStartLoadRequest) => handleYouTubeNavigation(request, youtubeId),
    [youtubeId],
  );

  const onOpenWindow = useCallback(
    (e: { nativeEvent: { targetUrl: string } }) =>
      handleYouTubeOpenWindow(e.nativeEvent.targetUrl, youtubeId),
    [youtubeId],
  );

  const onShare = useCallback(() => shareYouTubeVideo(youtubeId), [youtubeId]);

  if (isActive) {
    return (
      <View style={styles.mediaContainer}>
        <WebView
          source={{ html: buildYouTubeEmbedHtml(youtubeId, true), baseUrl: 'https://example.com' }}
          style={videoStyles.player}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
          onShouldStartLoadWithRequest={onNavRequest}
          onOpenWindow={onOpenWindow}
        />
        <View style={videoStyles.shareOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={videoStyles.shareHitArea}
            onPress={onShare}
            accessibilityLabel="Share video"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mediaContainer}>
      <Image source={{ uri: thumb || PLACEHOLDER_POSTER }} style={styles.media} />
      <View style={styles.playBtn}>
        <Ionicons name="play" size={24} color={colors.white} style={styles.playIcon} />
      </View>
      {duration ? (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{duration}</Text>
        </View>
      ) : null}
    </View>
  );
}

const videoStyles = StyleSheet.create({
  player: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.black,
  },
  shareOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shareHitArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 56,
    height: 44,
  },
});
