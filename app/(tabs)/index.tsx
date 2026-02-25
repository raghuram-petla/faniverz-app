import { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { usePlatforms, useMoviePlatformMap } from '@/features/ott/hooks';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { MovieCard } from '@/components/movie/MovieCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Movie, OTTPlatform } from '@/types';

const HEADER_CONTENT_HEIGHT = 56;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const featuredMovies = allMovies
    .filter((m) => m.release_type === 'theatrical' || m.release_type === 'ott')
    .slice(0, 7);
  const theatricalMovies = allMovies.filter((m) => m.release_type === 'theatrical');
  const streamingMovies = allMovies.filter((m) => m.release_type === 'ott');
  const upcomingMovies = allMovies.filter((m) => m.release_type === 'upcoming');
  const upcomingTheatrical = upcomingMovies.filter(
    (m) => !platformMap[m.id] || platformMap[m.id].length === 0,
  );
  const upcomingOTT = upcomingMovies.filter(
    (m) => platformMap[m.id] && platformMap[m.id].length > 0,
  );

  const renderMovieCard = (movie: Movie, showDate = false) => (
    <MovieCard
      key={movie.id}
      movie={movie}
      platforms={platformMap[movie.id]}
      showReleaseDate={showDate}
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
        <Text style={styles.logoWordmark}>Faniverz</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/discover')}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <Ionicons name="search" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.white} />
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
                onAction={() => router.push('/discover?filter=theatrical')}
              />
              <FlatList
                data={theatricalMovies}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderMovieCard(item)}
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
                onAction={() => router.push('/discover?filter=ott')}
              />
              <FlatList
                data={streamingMovies}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderMovieCard(item)}
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
                {platforms.slice(0, 8).map((platform) => (
                  <PlatformSquare
                    key={platform.id}
                    platform={platform}
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

function PlatformSquare({ platform, onPress }: { platform: OTTPlatform; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.platformSquare, { backgroundColor: platform.color }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={platform.name}
    >
      <Text style={styles.platformSquareLogo}>{platform.logo}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },
  safeAreaCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.black,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 12,
    backgroundColor: colors.black,
  },
  logoWordmark: {
    fontFamily: 'Exo2_800ExtraBold_Italic',
    fontSize: 26,
    color: colors.white,
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  sections: {
    paddingBottom: 100,
    gap: 32,
    paddingTop: 16,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  subsection: {
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  platformSquare: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformSquareLogo: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
});
