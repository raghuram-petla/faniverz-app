import { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme/colors';
import {
  buildYouTubeEmbedHtml,
  shareYouTubeVideo,
  handleYouTubeNavigation,
  handleYouTubeOpenWindow,
} from '@/utils/youtubeNavigation';
import { WEBVIEW_BASE_URL } from '@/constants/webview';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import type { MovieVideo } from '@/types';
import type { SemanticTheme } from '@shared/themes';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

const SCREEN_WIDTH = Dimensions.get('window').width;
/** @invariant Card spans full width minus 16px horizontal padding on each side */
const CARD_WIDTH = SCREEN_WIDTH - 32;
/** @coupling 16:9 aspect ratio matches YouTube video thumbnails */
const THUMB_HEIGHT = Math.round(CARD_WIDTH * (9 / 16));

/**
 * @contract Two render modes: thumbnail+play overlay (idle) or embedded WebView player (playing).
 * Only one card plays at a time — parent manages playingVideoId state.
 */
export interface MediaVideoCardProps {
  video: MovieVideo;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  /** @coupling Theme passed directly to avoid hook call inside list item */
  theme: SemanticTheme;
}

export function MediaVideoCard({ video, isPlaying, onPlay, theme }: MediaVideoCardProps) {
  const { t } = useTranslation();
  const styles = createCardStyles(theme);

  /** @boundary Intercepts WebView navigation to prevent leaving the app for non-YouTube URLs */
  const onNavRequest = useCallback(
    (request: ShouldStartLoadRequest) => handleYouTubeNavigation(request, video.youtube_id),
    [video.youtube_id],
  );

  /** @boundary Handles WebView window.open calls — redirects to YouTube app or in-app browser */
  const onOpenWindow = useCallback(
    (e: { nativeEvent: { targetUrl: string } }) =>
      handleYouTubeOpenWindow(e.nativeEvent.targetUrl, video.youtube_id),
    [video.youtube_id],
  );

  const onShare = useCallback(() => shareYouTubeVideo(video.youtube_id), [video.youtube_id]);

  if (isPlaying) {
    return (
      <View style={styles.card}>
        <View style={styles.playerWrapper}>
          <WebView
            source={{
              html: buildYouTubeEmbedHtml(video.youtube_id),
              baseUrl: WEBVIEW_BASE_URL,
            }}
            style={styles.player}
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
          {/** @edge Share overlay positioned over WebView bottom-left to intercept taps before WebView */}
          <View style={styles.shareOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.shareHitArea}
              onPress={onShare}
              accessibilityLabel={t('common.shareVideo')}
            />
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPlay(video.id)}
      activeOpacity={0.85}
      accessibilityLabel={`Play ${video.title}`}
    >
      <View style={styles.thumbnailWrapper}>
        <Image
          /** @nullable youtube_id may be missing for non-YouTube videos; falls back to placeholder */
          source={{
            uri: video.youtube_id
              ? `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`
              : PLACEHOLDER_POSTER,
          }}
          style={styles.thumbnail}
          contentFit="cover"
        />
        <View style={styles.playOverlay}>
          <Ionicons name="play-circle" size={56} color={colors.white} />
        </View>
        {video.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {video.title}
      </Text>
    </TouchableOpacity>
  );
}

const createCardStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    card: { gap: 8 },
    thumbnailWrapper: {
      width: CARD_WIDTH,
      height: THUMB_HEIGHT,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: t.surfaceElevated,
    },
    thumbnail: { width: '100%', height: '100%' },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    durationBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.8)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    durationText: { fontSize: 12, fontWeight: '600', color: colors.white },
    playerWrapper: {
      width: CARD_WIDTH,
      height: THUMB_HEIGHT,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.black,
    },
    player: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.black,
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
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: t.textPrimary,
    },
  });
