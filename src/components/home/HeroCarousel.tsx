import { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, FlatList, ViewToken } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Movie, OTTPlatform } from '@/types';
import { createStyles, SCREEN_WIDTH } from './HeroCarousel.styles';
import { HeroSlide } from './HeroSlide';
import { useEntityFollows, useFollowEntity, useUnfollowEntity } from '@/features/feed';
import { useWatchlistSet, useWatchlistMutations } from '@/features/watchlist/hooks';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useAuthGate } from '@/hooks/useAuthGate';

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
    return (
      <HeroSlide
        movie={item}
        platforms={platforms_}
        isFollowed={followSet.has(`movie:${item.id}`)}
        isInWatchlist={watchlistSet.has(item.id)}
        onWatchNow={() => handleWatchNow(item)}
        onActionToggle={(actionType) => handleActionToggle(item.id, actionType)}
      />
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
