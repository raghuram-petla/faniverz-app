import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, FlatList, ViewToken } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import { Movie, OTTPlatform } from '@/types';
import { createStyles, SCREEN_WIDTH } from './HeroCarousel.styles';
import { HeroSlide } from './HeroSlide';
import { useEntityFollows, useFollowEntity, useUnfollowEntity } from '@/features/feed';
import { useWatchlistSet, useWatchlistMutations } from '@/features/watchlist/hooks';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useAuthGate } from '@/hooks/useAuthGate';

/** @invariant Must be long enough for user to read slide content */
const AUTO_PLAY_INTERVAL = 5000;
/** @sync Delay before resetting clone slide to real first — must exceed scroll animation duration */
const CLONE_RESET_DELAY = 400;

/** @contract Infinite-loop hero carousel with auto-play, dot pagination, and follow/watchlist actions */
interface HeroCarouselProps {
  movies: Movie[];
  /** @nullable When undefined, no platform badges render on any slide */
  platformMap?: Record<string, OTTPlatform[]>;
}

export function HeroCarousel({ movies, platformMap }: HeroCarouselProps) {
  const { theme } = useTheme();
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

  /** @edge Appends clone of first slide for seamless infinite loop; skipped for single-item lists */
  const extendedMovies = useMemo(() => {
    if (movies.length <= 1) return movies;
    return [...movies, movies[0]];
  }, [movies]);

  /** @sync Ref keeps movies.length in sync for use inside stale onViewableItemsChanged closure */
  const moviesLenRef = useRef(movies.length);
  moviesLenRef.current = movies.length;
  const cloneResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up clone reset timer on unmount
  useEffect(() => {
    return () => {
      if (cloneResetTimerRef.current) clearTimeout(cloneResetTimerRef.current);
    };
  }, []);

  /**
   * @sideeffect When clone slide becomes visible, schedules silent reset to real first index.
   * @assumes FlatList calls this with at least one viewable item when scrolling settles.
   */
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const idx = viewableItems[0].index;
      setActiveIndex(idx);
      // If viewing the clone, silently jump back to real first
      if (idx >= moviesLenRef.current && moviesLenRef.current > 1) {
        if (cloneResetTimerRef.current) clearTimeout(cloneResetTimerRef.current);
        cloneResetTimerRef.current = setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: 0, animated: false });
          setActiveIndex(0);
        }, CLONE_RESET_DELAY);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Auto-play: advance every 5 seconds, reset on manual swipe
  const startAutoPlay = useCallback(() => {
    if (movies.length <= 1) return;
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        // Always scroll forward; clone at end handles wrap-around
        const next = prev + 1;
        if (next >= movies.length + 1) {
          // Already past clone (shouldn't happen normally), jump to 0
          flatListRef.current?.scrollToIndex({ index: 0, animated: false });
          return 0;
        }
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

  /** @sideeffect Mutates follow/watchlist state via TanStack mutations; auth-gated */
  const handleActionToggle = useCallback(
    (movieId: string, actionType: 'follow' | 'watchlist') =>
      gate(() => {
        // @contract: isPending guards prevent duplicate follow/watchlist API calls from rapid taps
        if (
          followMutation.isPending ||
          unfollowMutation.isPending ||
          addWatchlist.isPending ||
          removeWatchlist.isPending
        )
          return;
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

  /** @edge Empty movies array renders nothing — parent should show skeleton instead */
  if (movies.length === 0) return null;

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
        data={extendedMovies}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        /** @invariant Clone slide at index === movies.length gets distinct key to avoid React reconciliation issues */
        keyExtractor={(item, index) => (index === movies.length ? `${item.id}-clone` : item.id)}
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

      {/* Pagination dots — animated width transition */}
      {movies.length > 1 && (
        <View style={styles.dotsRow}>
          {movies.map((_, index) => (
            <CarouselDot
              key={index}
              isActive={index === activeIndex % movies.length}
              onPress={() => scrollToDot(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** @contract Animated dot: expands to 32px when active, collapses to 6px when inactive */
function CarouselDot({ isActive, onPress }: { isActive: boolean; onPress: () => void }) {
  const animationsEnabled = useAnimationsEnabled();
  const width = useSharedValue(isActive ? 32 : 6);
  const opacity = useSharedValue(isActive ? 1 : 0.3);

  useEffect(() => {
    const w = isActive ? 32 : 6;
    const o = isActive ? 1 : 0.3;
    width.value = animationsEnabled ? withTiming(w, { duration: 300 }) : w;
    opacity.value = animationsEnabled ? withTiming(o, { duration: 300 }) : o;
  }, [isActive, width, opacity, animationsEnabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[{ height: 6, borderRadius: 3, backgroundColor: palette.white }, animatedStyle]}
      />
    </TouchableOpacity>
  );
}
