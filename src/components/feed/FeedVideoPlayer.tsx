import { useCallback } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { getYouTubeThumbnail } from '@/constants/feedHelpers';
import {
  buildYouTubeEmbedHtml,
  shareYouTubeVideo,
  handleYouTubeNavigation,
  handleYouTubeOpenWindow,
} from '@/utils/youtubeNavigation';
import { WEBVIEW_BASE_URL } from '@/constants/webview';
import { createFeedCardStyles } from '@/styles/tabs/feed.styles';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

export interface FeedVideoPlayerProps {
  youtubeId: string;
  thumbnailUrl: string | null;
  isActive: boolean;
}

/** @contract renders WebView when isActive, static thumbnail otherwise */
export function FeedVideoPlayer({ youtubeId, thumbnailUrl, isActive }: FeedVideoPlayerProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createFeedCardStyles(theme);
  /** @nullable thumbnailUrl — falls back to YouTube's auto-generated thumbnail */
  const thumb = thumbnailUrl ?? getYouTubeThumbnail(youtubeId);

  const onNavRequest = useCallback(
    /** @boundary intercepts WebView navigation to prevent leaving the embed context */
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
          source={{ html: buildYouTubeEmbedHtml(youtubeId, true), baseUrl: WEBVIEW_BASE_URL }}
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
        {/* @edge share hit area overlays bottom-left of video; pointerEvents="box-none" lets taps pass through elsewhere */}
        <View style={videoStyles.shareOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={videoStyles.shareHitArea}
            onPress={onShare}
            accessibilityLabel={t('common.shareVideo')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mediaContainer}>
      <Image
        source={{ uri: thumb || PLACEHOLDER_POSTER }}
        style={styles.media}
        resizeMode="cover"
      />
      <View style={styles.playBtn}>
        <Ionicons name="play" size={24} color={colors.white} style={styles.playIcon} />
      </View>
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
