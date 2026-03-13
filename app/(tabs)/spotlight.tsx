import { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { usePlatforms, useMoviePlatformMap } from '@/features/ott/hooks';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { MovieCard } from '@/components/movie/MovieCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PlatformSquare } from '@/components/ui/PlatformSquare';
import { SpotlightSkeleton } from '@/components/spotlight/SpotlightSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollToTop } from '@react-navigation/native';
import { Movie } from '@/types';
import { deriveMovieStatus } from '@shared/movieStatus';
import { createStyles } from '@/styles/tabs/spotlight.styles';

const HorizontalSpacer = () => <View style={{ width: 12 }} />;
// @invariant Hero carousel shows at most 7 featured movies; platform grid shows at most 8 tiles
const FEATURED_MOVIE_LIMIT = 7;
const PLATFORM_TILE_COUNT = 8;
const PLATFORM_GRID_H_PADDING = 32;
const PLATFORM_GRID_GAP_TOTAL = 36;

// @boundary Spotlight home — hero carousel, sections by status, and platform grid
// @coupling useMovies + useMoviePlatformMap + usePlatforms — three data fetches combined
export default function SpotlightScreen() {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  // @assumes 4 tiles per row; tileSize is derived from screen width minus padding/gaps
  const tileSize = Math.floor(
    (screenWidth - PLATFORM_GRID_H_PADDING - PLATFORM_GRID_GAP_TOTAL) / 4,
  );
  // @contract: useMovies fetches ALL movies in a single query (not paginated) — fine for small catalog
  const { data: allMovies = [], isLoading, refetch: refetchMovies } = useMovies();
  const { data: platforms = [], refetch: refetchPlatforms } = usePlatforms();

  const movieIds = allMovies.map((m) => m.id);
  const { data: platformMap = {} } = useMoviePlatformMap(movieIds);
  const { refreshing, onRefresh } = useRefresh(refetchMovies, refetchPlatforms);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // @coupling deriveMovieStatus — shared logic from @shared/movieStatus determines in_theaters/streaming/upcoming
  const moviesWithStatus = allMovies.map((m) => ({
    movie: m,
    status: deriveMovieStatus(m, (platformMap[m.id] ?? []).length),
  }));
  // @contract Featured movies = in_theaters + streaming, sorted by is_featured flag, capped at 7
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
  // @contract Upcoming split: no platforms = theatrical release; has platforms = OTT release
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
      <SafeAreaCover />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="star" size={20} color={colors.white} />
          </View>
          <Text style={styles.headerTitle}>{t('spotlight.title')}</Text>
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => router.push('/discover')}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Ionicons name="search" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={handlePullScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          refreshing={refreshing}
        />
        {/* @edge Shows empty state only when ALL four movie categories are empty */}
        {isLoading ? (
          <SpotlightSkeleton />
        ) : featuredMovies.length === 0 &&
          theatricalMovies.length === 0 &&
          streamingMovies.length === 0 &&
          upcomingMovies.length === 0 ? (
          <EmptyState
            icon="film-outline"
            title={t('spotlight.noMovies')}
            subtitle={t('spotlight.checkBackSoon')}
          />
        ) : (
          <>
            {featuredMovies.length > 0 && (
              <HeroCarousel movies={featuredMovies} platformMap={platformMap} />
            )}

            <View style={styles.sections}>
              {theatricalMovies.length > 0 && (
                <View>
                  <SectionHeader
                    title={t('spotlight.inTheaters')}
                    actionLabel={t('common.seeAll')}
                    onAction={() => router.push('/discover?filter=in_theaters')}
                  />
                  <FlatList
                    data={theatricalMovies}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => renderMovieCard(item, false, false)}
                    ItemSeparatorComponent={HorizontalSpacer}
                  />
                </View>
              )}

              {streamingMovies.length > 0 && (
                <View>
                  <SectionHeader
                    title={t('home.streamingNow')}
                    actionLabel={t('common.seeAll')}
                    onAction={() => router.push('/discover?filter=streaming')}
                  />
                  <FlatList
                    data={streamingMovies}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => renderMovieCard(item, false, false)}
                    ItemSeparatorComponent={HorizontalSpacer}
                  />
                </View>
              )}

              {(upcomingTheatrical.length > 0 || upcomingOTT.length > 0) && (
                <View>
                  <SectionHeader
                    title={t('home.comingSoon')}
                    actionLabel={t('common.seeAll')}
                    onAction={() => router.push('/discover?filter=upcoming')}
                  />

                  {upcomingTheatrical.length > 0 && (
                    <View style={styles.subsection}>
                      <Text style={styles.subsectionTitle}>{t('home.toTheaters')}</Text>
                      <FlatList
                        data={upcomingTheatrical}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => renderMovieCard(item, true)}
                        ItemSeparatorComponent={HorizontalSpacer}
                      />
                    </View>
                  )}

                  {upcomingOTT.length > 0 && (
                    <View style={styles.subsection}>
                      <Text style={styles.subsectionTitle}>{t('home.toStreaming')}</Text>
                      <FlatList
                        data={upcomingOTT}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => renderMovieCard(item, true)}
                        ItemSeparatorComponent={HorizontalSpacer}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* @invariant Displays at most PLATFORM_TILE_COUNT (8) platform tiles */}
              {platforms.length > 0 && (
                <View>
                  <SectionHeader title={t('home.browseByPlatform')} />
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
          </>
        )}
      </ScrollView>
    </View>
  );
}
