import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { colors } from '@/theme/colors';
import {
  getCategoryColor,
  getCategoryLabel,
  getCategoryIconName,
  formatViews,
} from '@/constants/surpriseHelpers';
import type { SurpriseContent } from '@/types';

const FEATURED_VIDEO_ID = 'roYRXbhxhlM';
const THUMBNAIL_URL = `https://img.youtube.com/vi/${FEATURED_VIDEO_ID}/hqdefault.jpg`;

const VIDEO_HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0}body{background:#000;overflow:hidden}
iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}</style>
</head><body>
<iframe src="https://www.youtube.com/embed/${FEATURED_VIDEO_ID}?autoplay=1&playsinline=1&rel=0"
  allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>
</body></html>`;

interface FeaturedVideoCardProps {
  item: SurpriseContent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

export function FeaturedVideoCard({ item, styles }: FeaturedVideoCardProps) {
  const catColor = getCategoryColor(item.category);
  const catLabel = getCategoryLabel(item.category);
  const iconName = getCategoryIconName(item.category);
  const [activated, setActivated] = useState(false);

  const handlePlay = useCallback(() => {
    setActivated(true);
  }, []);

  return (
    <View style={styles.featuredContainer}>
      <View style={styles.featuredVideoBox}>
        {!activated ? (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            onPress={handlePlay}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Play video"
          >
            <Image
              source={{ uri: THUMBNAIL_URL }}
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
              source={{ html: VIDEO_HTML, baseUrl: 'https://example.com' }}
              style={StyleSheet.absoluteFill}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              originWhitelist={['*']}
              scrollEnabled={false}
              bounces={false}
              javaScriptEnabled
            />
          </View>
        )}
      </View>

      <View style={styles.featuredMeta}>
        <View style={styles.featuredBadgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: catColor }]}>
            <Ionicons name={iconName} size={11} color={colors.white} />
            <Text style={styles.categoryBadgeText}>{catLabel.toUpperCase()}</Text>
          </View>
          {item.duration ? <Text style={styles.featuredDuration}>{item.duration}</Text> : null}
          <Text style={styles.featuredViews}>{formatViews(item.views)} views</Text>
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
