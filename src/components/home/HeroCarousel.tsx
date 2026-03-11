import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ViewToken } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { getMovieStatusLabel, getMovieStatusColor } from '@/constants';
import { deriveMovieStatus } from '@shared/movieStatus';
import { PlatformBadge } from '@/components/ui/PlatformBadge';
import { Movie, OTTPlatform } from '@/types';
import { createStyles, SCREEN_WIDTH } from './HeroCarousel.styles';
import { getImageUrl } from '@shared/imageUrl';
import { useEntityFollows, useFollowEntity, useUnfollowEntity } from '@/features/feed';
import { useWatchlistSet, useWatchlistMutations } from '@/features/watchlist/hooks';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useAuthGate } from '@/hooks/useAuthGate';
import { getMovieActionType } from '@/hooks/useMovieAction';

const AUTO_PLAY_INTERVAL = 5000;

interface HeroCarouselProps {
  movies: Movie[];
  platformMap?: Record<string, OTTPlatform[]>;
}

export function HeroCarousel({ movies, platformMap }: HeroCarouselProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Movie>>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  const { watchlistSet } = useWatchlistSet();
  const { add: addWatchlist, remove: removeWatchlist } = useWatchlistMutations();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { gate } = useAuthGate();

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

  const handleActionToggle = useCallback(
    (movieId: string, actionType: 'follow' | 'watchlist') =>
      gate(() => {
        if (actionType === 'follow') {
          if (followSet.has(`movie:${movieId}`)) {
            unfollowMutation.mutate({ entityType: 'movie', entityId: movieId });
          } else {
            followMutation.mutate({ entityType: 'movie', entityId: movieId });
          }
        } else {
          if (watchlistSet.has(movieId)) {
            removeWatchlist.mutate({ userId, movieId });
          } else {
            addWatchlist.mutate({ userId, movieId });
          }
        }
      })(),
    [
      gate,
      followSet,
      followMutation,
      unfollowMutation,
      watchlistSet,
      addWatchlist,
      removeWatchlist,
      userId,
    ],
  );

  const renderSlide = ({ item }: { item: Movie }) => {
    const platforms_ = platformMap?.[item.id] ?? [];
    const releaseYear = item.release_date ? new Date(item.release_date).getFullYear() : null;
    const status = deriveMovieStatus(item, platforms_.length);
    const actionType = getMovieActionType(status);
    const isActionActive =
      actionType === 'follow' ? followSet.has(`movie:${item.id}`) : watchlistSet.has(item.id);

    return (
      <View style={styles.slide}>
        <Image
          source={{
            uri:
              getImageUrl(item.backdrop_url, 'md') ??
              getImageUrl(item.poster_url, 'md') ??
              undefined,
          }}
          style={styles.backdrop}
          contentFit="cover"
          contentPosition={
            (item.spotlight_focus_x ?? item.backdrop_focus_x) != null &&
            (item.spotlight_focus_y ?? item.backdrop_focus_y) != null
              ? {
                  left: `${Math.round(((item.spotlight_focus_x ?? item.backdrop_focus_x) as number) * 100)}%`,
                  top: `${Math.round(((item.spotlight_focus_y ?? item.backdrop_focus_y) as number) * 100)}%`,
                }
              : undefined
          }
        />

        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,1)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.content}>
          {/* Badges row */}
          <View style={styles.badgeRow}>
            {(status === 'in_theaters' || status === 'streaming') && (
              <View style={[styles.typeBadge, { backgroundColor: getMovieStatusColor(status) }]}>
                <Text style={styles.typeBadgeText}>{getMovieStatusLabel(status)}</Text>
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
                <PlatformBadge key={p.id} platform={p} size={28} />
              ))}
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.watchButton}
              onPress={() => handleWatchNow(item)}
              accessibilityRole="button"
              accessibilityLabel={status === 'in_theaters' ? 'Get Tickets' : 'Watch Now'}
            >
              <Ionicons
                name={status === 'in_theaters' ? 'ticket-outline' : 'play'}
                size={20}
                color="#000000"
              />
              <Text style={styles.watchButtonText}>
                {status === 'in_theaters' ? 'Get Tickets' : 'Watch Now'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionToggle(item.id, actionType)}
              accessibilityRole="button"
              accessibilityLabel={
                isActionActive
                  ? actionType === 'follow'
                    ? `Following ${item.title}, tap to unfollow`
                    : `${item.title} saved, tap to remove`
                  : actionType === 'follow'
                    ? `Follow ${item.title}`
                    : `Save ${item.title}`
              }
            >
              <Ionicons
                name={
                  isActionActive
                    ? actionType === 'follow'
                      ? 'heart'
                      : 'bookmark'
                    : actionType === 'follow'
                      ? 'heart-outline'
                      : 'bookmark-outline'
                }
                size={16}
                color={isActionActive ? palette.green500 : '#000000'}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: isActionActive ? palette.green500 : '#000000' },
                ]}
              >
                {isActionActive
                  ? actionType === 'follow'
                    ? 'Following'
                    : 'Saved'
                  : actionType === 'follow'
                    ? 'Follow'
                    : 'Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => handleWatchNow(item)}
              accessibilityRole="button"
              accessibilityLabel="More Info"
            >
              <Ionicons name="chevron-forward" size={22} color="#000000" />
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
