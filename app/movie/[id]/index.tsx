import { useState, useMemo } from 'react';
import { View, Share } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMovieDetail } from '@/features/movies/hooks/useMovieDetail';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useMovieReviews, useReviewMutations } from '@/features/reviews/hooks';
import { useMovieAction } from '@/hooks/useMovieAction';
import { deriveMovieStatus } from '@shared/movieStatus';
import { MovieHeroSection } from '@/components/movie/detail/MovieHeroSection';
import { WatchOnSection } from '@/components/movie/detail/WatchOnSection';
import { OverviewTab } from '@/components/movie/detail/OverviewTab';
import { CastTab } from '@/components/movie/detail/CastTab';
import { ReviewsTab } from '@/components/movie/detail/ReviewsTab';
import { ReviewModal } from '@/components/movie/detail/ReviewModal';
import { MovieDetailHeader } from '@/components/movie/detail/MovieDetailHeader';
import { createStyles } from '@/styles/movieDetail.styles';
import { useTheme } from '@/theme';
import { extractReleaseYear } from '@/utils/formatDate';
import { AnimatedTabBar } from '@/components/ui/AnimatedTabBar';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useAuthGate } from '@/hooks/useAuthGate';
import { MovieDetailSkeleton } from '@/components/movie/detail/MovieDetailSkeleton';

type TabName = 'overview' | 'cast' | 'reviews';
type DisplayTab = TabName | 'media';

// @boundary: Movie detail — hero section + tabbed content (overview, media, cast, reviews)
// @coupling: useMovieDetail, useMovieReviews, useReviewMutations, useMovieAction, deriveMovieStatus
export default function MovieDetailScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  // @boundary: id comes from URL param — defaults to '' which returns null from API
  const { data: movie, isLoading: movieLoading, refetch: refetchMovie } = useMovieDetail(id ?? '');
  const { data: reviews = [], refetch: refetchReviews } = useMovieReviews(id ?? '');
  // @sideeffect: createReview.mutate triggers optimistic update + invalidates review cache
  const { create: createReview, helpful: helpfulMutation } = useReviewMutations();
  // @contract: gate() wraps callbacks — redirects to login if user is unauthenticated
  const { gate } = useAuthGate();
  const { refreshing, onRefresh } = useRefresh(refetchMovie, refetchReviews);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    androidPullProps,
  } = usePullToRefresh(onRefresh, refreshing);

  // @invariant: useMovieAction must be called unconditionally (rules of hooks)
  // @edge: stub object used when movie hasn't loaded yet — action will be inert
  const movieForAction = movie ?? { id: id ?? '', release_date: null, in_theaters: false };
  // @contract: actionType is 'watchlist' | 'watched' | 'reminder' based on movie release status
  // @coupling: useMovieAction internally uses useWatchlistEntry + useToggleWatched + useToggleReminder
  const {
    actionType,
    isActive: isActionActive,
    onPress: handleAction,
  } = useMovieAction(movieForAction, movie?.platforms.length ?? 0);

  const [activeTab, setActiveTab] = useState<TabName>('overview');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [containsSpoiler, setContainsSpoiler] = useState(false);

  // @invariant: tab order must match the UI layout — overview, media, cast, reviews
  // @coupling: AnimatedTabBar renders these in order; the 'media' tab is handled specially (navigates to separate route)
  const tabs: DisplayTab[] = ['overview', 'media', 'cast', 'reviews'];

  if (movieLoading || !movie) {
    return <MovieDetailSkeleton />;
  }

  const handleShare = async () => {
    const year = extractReleaseYear(movie.release_date);
    const text = `${movie.title}${year ? ` (${year})` : ''} — ${movie.rating}★\n${movie.synopsis?.slice(0, 100) ?? ''}\n\nTrack it on Faniverz!`;
    await Share.share({ message: text }).catch(() => {});
  };

  // @edge: rating === 0 guard prevents submitting empty reviews
  // @sideeffect: resets all review form state after submit; closes modal immediately (optimistic)
  const handleSubmitReview = gate(() => {
    /* istanbul ignore next -- submit button is disabled when rating is 0 */
    if (reviewRating === 0) return;
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
  });

  // @coupling: deriveMovieStatus is a shared function that determines theatrical/ott/upcoming status
  const movieStatus = deriveMovieStatus(movie, movie.platforms.length);
  const releaseYear = extractReleaseYear(movie.release_date);
  const tabLabels: Record<DisplayTab, string> = {
    overview: t('movie.overview'),
    media: t('movieDetail.media'),
    cast: t('movie.cast'),
    reviews: t('movie.reviews'),
  };
  // @boundary: media tab navigates to a separate route instead of rendering inline
  const handleTabPress = (tab: DisplayTab) => {
    if (tab === 'media') {
      router.push(`/movie/${id}/media`);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      <ScrollView
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top }}
        onScroll={handlePullScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        {...androidPullProps}
      >
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          refreshing={refreshing}
        />
        <MovieHeroSection movie={movie} movieStatus={movieStatus} releaseYear={releaseYear} />

        <WatchOnSection
          platforms={movie.platforms}
          movieStatus={movieStatus}
          releaseDate={movie.release_date}
        />

        {/* Tabs */}
        <View style={{ marginTop: 24 }}>
          <AnimatedTabBar
            tabs={tabs}
            labels={tabLabels}
            activeTab={activeTab}
            onTabPress={handleTabPress}
          />
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <OverviewTab movie={movie} onExploreMedia={() => router.push(`/movie/${id}/media`)} />
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
              onWriteReview={gate(() => setShowReviewModal(true))}
              onHelpful={gate((reviewId: string) => helpfulMutation.mutate({ userId, reviewId }))}
            />
          )}
        </View>
      </ScrollView>

      <MovieDetailHeader
        insetsTop={insets.top}
        actionType={actionType}
        isActionActive={isActionActive}
        onBack={() => router.back()}
        onShare={handleShare}
        onToggleAction={handleAction}
        movieTitle={movie.title}
      />

      <ReviewModal
        visible={showReviewModal}
        movieTitle={movie.title}
        posterUrl={movie.poster_url}
        posterImageType={movie.poster_image_type}
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
    </View>
  );
}
