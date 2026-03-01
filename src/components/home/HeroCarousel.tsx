import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { getReleaseTypeLabel, getReleaseTypeColor } from '@/constants/releaseType';
import { Movie, OTTPlatform } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 600;
const AUTO_PLAY_INTERVAL = 5000;

interface HeroCarouselProps {
  movies: Movie[];
  platformMap?: Record<string, OTTPlatform[]>;
}

export function HeroCarousel({ movies, platformMap }: HeroCarouselProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Movie>>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track visible item via onViewableItemsChanged
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Auto-play: advance every 5 seconds, reset on manual swipe
  const startAutoPlay = useCallback(() => {
    if (movies.length <= 1) return;
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % movies.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_PLAY_INTERVAL);
  }, [movies.length]);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [startAutoPlay]);

  const scrollToDot = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
    // Reset auto-play timer on manual interaction
    startAutoPlay();
  };

  const handleWatchNow = useCallback(
    (movie: Movie) => {
      router.push(`/movie/${movie.id}`);
    },
    [router],
  );

  if (movies.length === 0) return null;

  const renderSlide = ({ item }: { item: Movie }) => {
    const platforms_ = platformMap?.[item.id] ?? [];
    const releaseYear = new Date(item.release_date).getFullYear();

    return (
      <View style={styles.slide}>
        <Image
          source={{ uri: item.backdrop_url ?? item.poster_url ?? undefined }}
          style={styles.backdrop}
          contentFit="cover"
          contentPosition={
            item.backdrop_focus_x != null && item.backdrop_focus_y != null
              ? {
                  left: `${Math.round(item.backdrop_focus_x * 100)}%`,
                  top: `${Math.round(item.backdrop_focus_y * 100)}%`,
                }
              : undefined
          }
        />

        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.content}>
          {/* Badges row */}
          <View style={styles.badgeRow}>
            {(item.release_type === 'theatrical' || item.release_type === 'ott') && (
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: getReleaseTypeColor(item.release_type) },
                ]}
              >
                <Text style={styles.typeBadgeText}>{getReleaseTypeLabel(item.release_type)}</Text>
              </View>
            )}
            {item.rating > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color={colors.yellow400} />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Meta info */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{releaseYear}</Text>
            <Text style={styles.metaDot}>•</Text>
            {item.runtime ? (
              <>
                <Text style={styles.metaText}>{item.runtime}m</Text>
                <Text style={styles.metaDot}>•</Text>
              </>
            ) : null}
            {item.certification && (
              <View style={styles.certBadge}>
                <Text style={styles.certText}>{item.certification}</Text>
              </View>
            )}
          </View>

          {/* OTT Platforms */}
          {platforms_.length > 0 && (
            <View style={styles.platformRow}>
              <Text style={styles.platformLabel}>Watch on:</Text>
              {platforms_.map((p) => (
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
              onPress={() => handleWatchNow(item)}
              accessibilityRole="button"
              accessibilityLabel={item.release_type === 'theatrical' ? 'Get Tickets' : 'Watch Now'}
            >
              <Ionicons
                name={item.release_type === 'theatrical' ? 'ticket-outline' : 'play'}
                size={20}
                color={colors.black}
              />
              <Text style={styles.watchButtonText}>
                {item.release_type === 'theatrical' ? 'Get Tickets' : 'Watch Now'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => handleWatchNow(item)}
              accessibilityRole="button"
              accessibilityLabel="More Info"
            >
              <Ionicons name="information-circle-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={movies}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScrollBeginDrag={() => {
          // User started swiping — reset auto-play timer
          if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        }}
        onScrollEndDrag={() => {
          // User finished swiping — restart auto-play
          startAutoPlay();
        }}
      />

      {/* Pagination dots — overlaid at the bottom */}
      {movies.length > 1 && (
        <View style={styles.dotsRow}>
          {movies.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToDot(index)}
              style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
  },
  slide: {
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
    paddingBottom: 56,
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
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
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
