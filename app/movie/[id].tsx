import React from 'react';
import { View, ScrollView, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useMovieDetail, useMovieCast } from '@/features/movies/hooks/useMovieDetail';
import { useOttReleases } from '@/features/ott/hooks';
import { useAuth } from '@/features/auth/hooks/useAuth';
import MovieHero from '@/components/movie/MovieHero';
import MovieMeta from '@/components/movie/MovieMeta';
import SynopsisSection from '@/components/movie/SynopsisSection';
import CastCarousel from '@/components/movie/CastCarousel';
import TrailerPlayer from '@/components/movie/TrailerPlayer';
import WatchOnPlatform from '@/components/movie/WatchOnPlatform';
import WatchlistButton from '@/components/watchlist/WatchlistButton';
import ShareButton from '@/components/common/ShareButton';
import ReviewSummary from '@/components/review/ReviewSummary';

export default function MovieDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);
  const { data: movie, isLoading } = useMovieDetail(movieId);
  const { data: cast = [] } = useMovieCast(movieId);
  const { data: ottReleases = [] } = useOttReleases(movieId);

  if (isLoading || !movie) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View testID="movie-detail-loading" style={styles.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ShareButton title={movie.title} releaseDate={movie.release_date} />
      </View>
      <ScrollView testID="movie-detail-screen" style={styles.container}>
        <MovieHero backdropPath={movie.backdrop_path} posterPath={movie.poster_path} />
        <MovieMeta movie={movie} />
        {ottReleases.length > 0 && (
          <View testID="where-to-watch-section" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Where to Watch</Text>
            {ottReleases.map((release) => (
              <WatchOnPlatform key={release.id} release={release} />
            ))}
          </View>
        )}
        <SynopsisSection overview={movie.overview} overviewTe={movie.overview_te} />
        <CastCarousel cast={cast} />
        <TrailerPlayer youtubeKey={movie.trailer_youtube_key} />
        <ReviewSummary
          averageRating={movie.vote_average ?? 0}
          totalCount={movie.vote_count ?? 0}
          onWriteReview={() => router.push(`/review/write/${movieId}`)}
          onSeeAll={() => router.push(`/review/${movieId}`)}
        />
      </ScrollView>
      <WatchlistButton userId={user?.id} movieId={movieId} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  section: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});
