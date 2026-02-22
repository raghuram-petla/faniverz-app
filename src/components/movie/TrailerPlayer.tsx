import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';

interface TrailerPlayerProps {
  youtubeKey: string | null;
}

export default function TrailerPlayer({ youtubeKey }: TrailerPlayerProps) {
  const { colors } = useTheme();
  const [playing, setPlaying] = useState(false);

  if (!youtubeKey) return null;

  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeKey}/hqdefault.jpg`;

  if (playing) {
    // Placeholder for YouTube iframe — will use react-native-youtube-iframe
    return (
      <View testID="trailer-player" style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Trailer</Text>
        <View testID="youtube-player" style={[styles.player, { backgroundColor: '#000000' }]}>
          <Text style={styles.playingText}>Playing...</Text>
        </View>
      </View>
    );
  }

  return (
    <View testID="trailer-section" style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Trailer</Text>
      <TouchableOpacity testID="trailer-thumbnail" onPress={() => setPlaying(true)}>
        <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
        <View style={styles.playButton}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  playButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  playIcon: {
    fontSize: 48,
    color: '#FFFFFF',
  },
  player: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
