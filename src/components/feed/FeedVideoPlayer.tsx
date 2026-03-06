import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/theme';
import { createFeedCardStyles } from '@/styles/tabs/feed.styles';

export interface FeedVideoPlayerProps {
  youtubeId: string;
  thumbnailUrl: string | null;
  duration: string | null;
  isActive: boolean;
}

function buildVideoHtml(youtubeId: string): string {
  return `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0}body{background:#000;overflow:hidden}
iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}</style>
</head><body>
<iframe src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1&mute=1&rel=0"
  allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>
</body></html>`;
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

  if (isActive) {
    return (
      <View style={styles.mediaContainer}>
        <WebView
          source={{ html: buildVideoHtml(youtubeId), baseUrl: 'https://example.com' }}
          style={videoStyles.player}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
        />
      </View>
    );
  }

  return (
    <View style={styles.mediaContainer}>
      <Image source={{ uri: thumb }} style={styles.media} />
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
    backgroundColor: '#000',
  },
});
