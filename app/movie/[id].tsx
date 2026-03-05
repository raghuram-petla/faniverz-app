import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, ScrollView, Share } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMovieDetail } from '@/features/movies/hooks/useMovieDetail';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useIsWatchlisted, useWatchlistMutations } from '@/features/watchlist/hooks';
import { useMovieReviews, useReviewMutations } from '@/features/reviews/hooks';
import { deriveMovieStatus } from '@shared/movieStatus';
import { VIDEO_TYPES } from '@shared/constants';
import type { MovieVideo, MoviePoster } from '@/types';
import { MovieHeroSection } from '@/components/movie/detail/MovieHeroSection';
import { WatchOnSection } from '@/components/movie/detail/WatchOnSection';
import { OverviewTab } from '@/components/movie/detail/OverviewTab';
import { MediaTab } from '@/components/movie/detail/MediaTab';
import { CastTab } from '@/components/movie/detail/CastTab';
import { ReviewsTab } from '@/components/movie/detail/ReviewsTab';
import { ReviewModal } from '@/components/movie/detail/ReviewModal';
import { PosterModal } from '@/components/movie/detail/PosterModal';
import { MovieDetailHeader } from '@/components/movie/detail/MovieDetailHeader';
import { createStyles } from '@/styles/movieDetail.styles';
import { useTheme } from '@/theme';

type TabName = 'overview' | 'media' | 'cast' | 'reviews';

export default function MovieDetailScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const navIndex = navigation.getState()?.index ?? 0;
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { data: movie } = useMovieDetail(id ?? '');
  const { data: watchlistEntry } = useIsWatchlisted(userId, id ?? '');
  const { add: addWatchlist, remove: removeWatchlist } = useWatchlistMutations();
  const { data: reviews = [] } = useMovieReviews(id ?? '');
  const { create: createReview, helpful: helpfulMutation } = useReviewMutations();

  const [activeTab, setActiveTab] = useState<TabName>('overview');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [containsSpoiler, setContainsSpoiler] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState<MoviePoster | null>(null);

  const isWatchlisted = !!watchlistEntry;

  if (!movie) return null;

  const handleShare = async () => {
    const text = `${movie.title} (${new Date(movie.release_date).getFullYear()}) — ${movie.rating}★\n${movie.synopsis?.slice(0, 100) ?? ''}\n\nTrack it on Faniverz!`;
    await Share.share({ message: text });
  };

  const handleToggleWatchlist = () => {
    if (!userId) return;
    if (isWatchlisted) {
      removeWatchlist.mutate({ userId, movieId: movie.id });
    } else {
      addWatchlist.mutate({ userId, movieId: movie.id });
    }
  };

  const handleSubmitReview = () => {
    if (!userId || reviewRating === 0) return;
    createReview.mutate({
      user_id: userId,
      movie_id: movie.id,
      rating: reviewRating,
      title: reviewTitle,
      body: reviewBody,
      contains_spoiler: containsSpoiler,
    });
    setShowReviewModal(false);
    setReviewRating(0);
    setReviewTitle('');
    setReviewBody('');
    setContainsSpoiler(false);
  };

  const movieStatus = deriveMovieStatus(movie, movie.platforms.length);
  const releaseYear = new Date(movie.release_date).getFullYear();
  const hasMedia = movie.videos.length > 0 || movie.posters.length > 0;
  const tabs: TabName[] = hasMedia
    ? ['overview', 'media', 'cast', 'reviews']
    : ['overview', 'cast', 'reviews'];

  const videosByType = hasMedia
    ? VIDEO_TYPES.reduce<{ label: string; videos: MovieVideo[] }[]>((acc, vt) => {
        const matches = movie.videos.filter((v) => v.video_type === vt.value);
        if (matches.length > 0) acc.push({ label: vt.label, videos: matches });
        return acc;
      }, [])
    : [];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.safeAreaCover, { height: insets.top }]} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top }}
      >
        <MovieHeroSection movie={movie} movieStatus={movieStatus} releaseYear={releaseYear} />

        <WatchOnSection
          platforms={movie.platforms}
          movieStatus={movieStatus}
          releaseDate={movie.release_date}
        />

        {/* Tabs */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <OverviewTab
              movie={movie}
              hasMedia={hasMedia}
              onSwitchToMedia={() => setActiveTab('media')}
            />
          )}
          {activeTab === 'media' && (
            <MediaTab
              videosByType={videosByType}
              posters={movie.posters}
              onSelectPoster={setSelectedPoster}
            />
          )}
          {activeTab === 'cast' && (
            <CastTab
              cast={movie.cast}
              crew={movie.crew}
              onActorPress={(actorId) => router.push(`/actor/${actorId}`)}
            />
          )}
          {activeTab === 'reviews' && (
            <ReviewsTab
              rating={movie.rating}
              reviewCount={movie.review_count}
              reviews={reviews}
              userId={userId}
              onWriteReview={() => setShowReviewModal(true)}
              onHelpful={(reviewId) => helpfulMutation.mutate({ userId, reviewId })}
            />
          )}
        </View>
      </ScrollView>

      <MovieDetailHeader
        insetsTop={insets.top}
        navIndex={navIndex}
        isWatchlisted={isWatchlisted}
        onBack={() => router.back()}
        onHome={() => router.dismissAll()}
        onShare={handleShare}
        onToggleWatchlist={handleToggleWatchlist}
      />

      <ReviewModal
        visible={showReviewModal}
        movieTitle={movie.title}
        posterUrl={movie.poster_url}
        releaseYear={releaseYear}
        director={movie.director}
        reviewRating={reviewRating}
        reviewTitle={reviewTitle}
        reviewBody={reviewBody}
        containsSpoiler={containsSpoiler}
        onRatingChange={setReviewRating}
        onTitleChange={setReviewTitle}
        onBodyChange={setReviewBody}
        onSpoilerToggle={() => setContainsSpoiler(!containsSpoiler)}
        onSubmit={handleSubmitReview}
        onClose={() => setShowReviewModal(false)}
      />

      <PosterModal poster={selectedPoster} onClose={() => setSelectedPoster(null)} />
    </View>
  );
}
