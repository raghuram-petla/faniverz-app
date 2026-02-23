import { View, Text, TouchableOpacity, ScrollView, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { usePlatforms, useMoviePlatformMap } from '@/features/ott/hooks';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { MovieCard } from '@/components/movie/MovieCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Movie, OTTPlatform } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { data: allMovies = [] } = useMovies();
  const { data: platforms = [] } = usePlatforms();

  const movieIds = allMovies.map((m) => m.id);
  const { data: platformMap = {} } = useMoviePlatformMap(movieIds);

  const featuredMovies = allMovies
    .filter((m) => m.release_type === 'theatrical' || m.release_type === 'ott')
    .slice(0, 3);
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Faniverz</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/search')}
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
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
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
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
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
