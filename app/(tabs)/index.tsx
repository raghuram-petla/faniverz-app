import { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { usePlatforms, useMoviePlatformMap } from '@/features/ott/hooks';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { MovieCard } from '@/components/movie/MovieCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PlatformSquare } from '@/components/ui/PlatformSquare';
import { Movie } from '@/types';
import { deriveMovieStatus } from '@shared/movieStatus';
import { createStyles } from './_styles/index.styles';

const HEADER_CONTENT_HEIGHT = 52;
const FEATURED_MOVIE_LIMIT = 7;
const PLATFORM_TILE_COUNT = 8;
const PLATFORM_GRID_H_PADDING = 32;
const PLATFORM_GRID_GAP_TOTAL = 36;

export default function HomeScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  // 16px padding each side + 3 gaps of 12px between 4 tiles
  const tileSize = Math.floor(
    (screenWidth - PLATFORM_GRID_H_PADDING - PLATFORM_GRID_GAP_TOTAL) / 4,
  );
  const { data: allMovies = [] } = useMovies();
  const { data: platforms = [] } = usePlatforms();

  const movieIds = allMovies.map((m) => m.id);
  const { data: platformMap = {} } = useMoviePlatformMap(movieIds);

  // YouTube-style collapsing header
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerOffset = useRef(0);
  const totalHeaderHeight = insets.top + HEADER_CONTENT_HEIGHT;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const rawY = e.nativeEvent.contentOffset.y;
      const currentY = Math.max(0, rawY);

      if (currentY <= 0) {
        // At the top — always show header
        headerOffset.current = 0;
        headerTranslateY.setValue(0);
        lastScrollY.current = 0;
        return;
      }

      const diff = currentY - lastScrollY.current;

      // Only hide the content part of the header, never the safe area
      headerOffset.current = Math.min(
        Math.max(headerOffset.current + diff, 0),
        HEADER_CONTENT_HEIGHT,
      );

      headerTranslateY.setValue(-headerOffset.current);
      lastScrollY.current = currentY;
    },
    [headerTranslateY],
  );

  const moviesWithStatus = allMovies.map((m) => ({
    movie: m,
    status: deriveMovieStatus(m, (platformMap[m.id] ?? []).length),
  }));
  const featuredMovies = moviesWithStatus
    .filter((ms) => ms.status === 'in_theaters' || ms.status === 'streaming')
    .sort((a, b) => (b.movie.is_featured ? 1 : 0) - (a.movie.is_featured ? 1 : 0))
    .map((ms) => ms.movie)
    .slice(0, FEATURED_MOVIE_LIMIT);
  const theatricalMovies = moviesWithStatus
    .filter((ms) => ms.status === 'in_theaters')
    .map((ms) => ms.movie);
  const streamingMovies = moviesWithStatus
    .filter((ms) => ms.status === 'streaming')
    .map((ms) => ms.movie);
  const upcomingMovies = moviesWithStatus
    .filter((ms) => ms.status === 'upcoming')
    .map((ms) => ms.movie);
  const upcomingTheatrical = upcomingMovies.filter(
    (m) => !platformMap[m.id] || platformMap[m.id].length === 0,
  );
  const upcomingOTT = upcomingMovies.filter(
    (m) => platformMap[m.id] && platformMap[m.id].length > 0,
  );

  const renderMovieCard = (movie: Movie, showDate = false, showTypeBadge = true) => (
    <MovieCard
      key={movie.id}
      movie={movie}
      platforms={platformMap[movie.id]}
      showReleaseDate={showDate}
      showTypeBadge={showTypeBadge}
    />
  );

  return (
    <View style={styles.screen}>
      {/* Fixed cover over Dynamic Island / status bar area — never moves */}
      <View style={[styles.safeAreaCover, { height: insets.top }]} />

      {/* YouTube-style header: slides up on scroll down, reappears on scroll up */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            height: totalHeaderHeight,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <Image
          source={require('../../assets/logo-full.png')}
          style={styles.logoFull}
          contentFit="contain"
          accessibilityLabel="Faniverz"
        />
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/discover')}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <Ionicons name="search" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: totalHeaderHeight }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Hero Carousel */}
        {featuredMovies.length > 0 && (
          <HeroCarousel movies={featuredMovies} platformMap={platformMap} />
        )}

        <View style={styles.sections}>
          {/* In Theaters */}
          {theatricalMovies.length > 0 && (
            <View>
              <SectionHeader
                title="In Theaters"
                actionLabel="See All"
                onAction={() => router.push('/discover?filter=in_theaters')}
              />
              <FlatList
                data={theatricalMovies}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderMovieCard(item, false, false)}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              />
            </View>
          )}

          {/* Streaming Now */}
          {streamingMovies.length > 0 && (
            <View>
              <SectionHeader
                title="Streaming Now"
                actionLabel="See All"
                onAction={() => router.push('/discover?filter=streaming')}
              />
              <FlatList
                data={streamingMovies}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderMovieCard(item, false, false)}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              />
            </View>
          )}

          {/* Coming Soon */}
          {(upcomingTheatrical.length > 0 || upcomingOTT.length > 0) && (
            <View>
              <SectionHeader
                title="Coming Soon"
                actionLabel="See All"
                onAction={() => router.push('/discover?filter=upcoming')}
              />

              {upcomingTheatrical.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>To Theaters</Text>
                  <FlatList
                    data={upcomingTheatrical}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => renderMovieCard(item, true)}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                  />
                </View>
              )}

              {upcomingOTT.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>To Streaming</Text>
                  <FlatList
                    data={upcomingOTT}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => renderMovieCard(item, true)}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                  />
                </View>
              )}
            </View>
          )}

          {/* Browse by Platform */}
          {platforms.length > 0 && (
            <View>
              <SectionHeader title="Browse by Platform" />
              <View style={styles.platformGrid}>
                {platforms.slice(0, PLATFORM_TILE_COUNT).map((platform) => (
                  <PlatformSquare
                    key={platform.id}
                    platform={platform}
                    size={tileSize}
                    onPress={() => router.push(`/discover?platform=${platform.id}`)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
