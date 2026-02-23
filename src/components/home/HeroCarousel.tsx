import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Movie, OTTPlatform } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 600;

interface HeroCarouselProps {
  movies: Movie[];
  platformMap?: Record<string, OTTPlatform[]>;
}

export function HeroCarousel({ movies, platformMap }: HeroCarouselProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  const featured = movies[activeIndex];
  const platforms = featured ? (platformMap?.[featured.id] ?? []) : [];

  useEffect(() => {
    if (movies.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % movies.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [movies.length]);

  const handleWatchNow = useCallback(() => {
    if (featured) router.push(`/movie/${featured.id}`);
  }, [featured, router]);

  if (!featured) return null;

  const releaseYear = new Date(featured.release_date).getFullYear();

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: featured.backdrop_url ?? featured.poster_url ?? undefined }}
        style={styles.backdrop}
        contentFit="cover"
        transition={500}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* Badges row */}
        <View style={styles.badgeRow}>
          {featured.release_type === 'theatrical' && (
            <View style={[styles.typeBadge, { backgroundColor: colors.red600 }]}>
              <Text style={styles.typeBadgeText}>In Theaters</Text>
            </View>
          )}
          {featured.release_type === 'ott' && (
            <View style={[styles.typeBadge, { backgroundColor: colors.purple600 }]}>
              <Text style={styles.typeBadgeText}>Streaming Now</Text>
            </View>
          )}
          {featured.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={colors.yellow400} />
              <Text style={styles.ratingText}>{featured.rating}</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {featured.title}
        </Text>

        {/* Meta info */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{releaseYear}</Text>
          <Text style={styles.metaDot}>•</Text>
          {featured.runtime ? (
            <>
              <Text style={styles.metaText}>{featured.runtime}m</Text>
              <Text style={styles.metaDot}>•</Text>
            </>
          ) : null}
          {featured.certification && (
            <View style={styles.certBadge}>
              <Text style={styles.certText}>{featured.certification}</Text>
            </View>
          )}
        </View>

        {/* OTT Platforms */}
        {platforms.length > 0 && (
          <View style={styles.platformRow}>
            <Text style={styles.platformLabel}>Watch on:</Text>
            {platforms.map((p) => (
              <View key={p.id} style={[styles.platformChip, { backgroundColor: p.color }]}>
                <Text style={styles.platformChipText}>{p.logo}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.watchButton}
            onPress={handleWatchNow}
            accessibilityRole="button"
            accessibilityLabel="Watch Now"
          >
            <Ionicons name="play" size={20} color={colors.black} />
            <Text style={styles.watchButtonText}>Watch Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={handleWatchNow}
            accessibilityRole="button"
            accessibilityLabel="More Info"
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {movies.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setActiveIndex(index)}
              style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  metaDot: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  certBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.white30,
    borderRadius: 4,
  },
  certText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  platformLabel: {
    fontSize: 14,
    color: colors.white60,
  },
  platformChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  platformChipText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  watchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    height: 48,
    borderRadius: 24,
    gap: 8,
  },
  watchButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.white30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.white,
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.white30,
  },
});
