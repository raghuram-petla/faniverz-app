import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { colors } from '@/theme/colors';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import {
  buildYouTubeEmbedHtml,
  shareYouTubeVideo,
  handleYouTubeNavigation,
  handleYouTubeOpenWindow,
} from '@/utils/youtubeNavigation';
import { WEBVIEW_BASE_URL } from '@/constants/webview';
import {
  getCategoryColor,
  getCategoryLabel,
  getCategoryIconName,
  formatViews,
} from '@/constants/surpriseHelpers';
import { getYouTubeThumbnail } from '@/constants/feedHelpers';
import { useTranslation } from 'react-i18next';
import type { SurpriseContent } from '@/types';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

/** @edge fallback video ID used when item.youtube_id is null — must be a valid public YouTube video
 * @invariant If this video is removed from YouTube, all items without youtube_id will show a broken player */
const FALLBACK_VIDEO_ID = 'roYRXbhxhlM';

interface FeaturedVideoCardProps {
  item: SurpriseContent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

/** @contract renders thumbnail until tapped, then swaps to live WebView embed */
export function FeaturedVideoCard({ item, styles }: FeaturedVideoCardProps) {
  const { t } = useTranslation();
  /** @nullable youtube_id — uses FALLBACK_VIDEO_ID when null */
  const videoId = item.youtube_id ?? FALLBACK_VIDEO_ID;
  const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId) : PLACEHOLDER_POSTER;
  const catColor = getCategoryColor(item.category);
  const catLabel = getCategoryLabel(item.category);
  const iconName = getCategoryIconName(item.category);
  /** @sideeffect once activated, the WebView replaces the thumbnail permanently for this render cycle */
  const [activated, setActivated] = useState(false);

  const handlePlay = useCallback(() => {
    setActivated(true);
  }, []);

  const onNavRequest = useCallback(
    (request: ShouldStartLoadRequest) => handleYouTubeNavigation(request, videoId),
    [videoId],
  );

  const onOpenWindow = useCallback(
    (e: { nativeEvent: { targetUrl: string } }) =>
      handleYouTubeOpenWindow(e.nativeEvent.targetUrl, videoId),
    [videoId],
  );

  const onShare = useCallback(() => shareYouTubeVideo(videoId), [videoId]);

  return (
    <View style={styles.featuredContainer}>
      <View style={styles.featuredVideoBox}>
        {!activated ? (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            onPress={handlePlay}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('common.playVideo')}
          >
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnailImage}
              contentFit="cover"
            />
            <View style={styles.thumbnailPlayBtn}>
              <Ionicons name="play" size={28} color={colors.white} style={styles.playIcon} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.videoPlayer}>
            <WebView
              source={{
                html: buildYouTubeEmbedHtml(videoId),
                baseUrl: WEBVIEW_BASE_URL,
              }}
              style={StyleSheet.absoluteFill}
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
            <View style={overlayStyles.shareOverlay} pointerEvents="box-none">
              <TouchableOpacity
                style={overlayStyles.shareHitArea}
                onPress={onShare}
                accessibilityLabel={t('common.shareVideo')}
              />
            </View>
          </View>
        )}
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

const overlayStyles = StyleSheet.create({
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
