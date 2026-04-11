import { useState, useMemo, useCallback } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMovieDetail } from '@/features/movies/hooks/useMovieDetail';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useMovieReviews } from '@/features/reviews/hooks';
import { useMovieAction } from '@/hooks/useMovieAction';
import { deriveMovieStatus } from '@shared/movieStatus';
import { getMovieStatusLabel } from '@/constants';
import { MovieHeroSection } from '@/components/movie/detail/MovieHeroSection';
import { WatchOnSection } from '@/components/movie/detail/WatchOnSection';
import { OverviewTab } from '@/components/movie/detail/OverviewTab';
import { CastTab } from '@/components/movie/detail/CastTab';
import { ReviewsTab } from '@/components/movie/detail/ReviewsTab';
import { ReviewModal } from '@/components/movie/detail/ReviewModal';
import { MovieDetailHeader } from '@/components/movie/detail/MovieDetailHeader';
import { createStyles, DETAIL_NAV_ROW_HEIGHT } from '@/styles/movieDetail.styles';
import { useTheme } from '@/theme';
import { extractReleaseYear } from '@/utils/formatDate';
import { shareContent } from '@/utils/shareContent';
import { AnimatedTabBar } from '@/components/ui/AnimatedTabBar';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useReviewForm } from '@/hooks/useReviewForm';
import { MovieDetailSkeleton } from '@/components/movie/detail/MovieDetailSkeleton';
import { useSnapScroll } from '@/hooks/useSnapScroll';
import {
  useDetailScrollAnimations,
  DETAIL_POSTER_EXPANDED_W,
  DETAIL_POSTER_EXPANDED_H,
  DETAIL_SCROLL_THRESHOLD,
} from '@/hooks/useDetailScrollAnimations';
import { getImageUrl, posterBucket } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { DETAIL_HERO_HEIGHT, DETAIL_HERO_INFO_OFFSET } from '@shared/constants';
import { useEditorialReview, usePollVoteMutation } from '@/features/editorial/hooks';

type TabName = 'overview' | 'cast' | 'reviews';
type DisplayTab = TabName | 'media';

// @boundary: Movie detail — hero with collapsing poster/title + tabbed content
// @coupling: useDetailScrollAnimations drives poster/title morph into sticky nav bar
export default function MovieDetailScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const movieId = id ?? '';
  const { data: movie, isLoading: movieLoading, refetch: refetchMovie } = useMovieDetail(movieId);
  const { data: reviews = [], refetch: refetchReviews } = useMovieReviews(movieId);
  const { gate } = useAuthGate();
  const { data: editorialReview } = useEditorialReview(movieId);
  const pollVoteMutation = usePollVoteMutation(movieId);
  const review = useReviewForm(movieId, userId);
  const { refreshing, onRefresh } = useRefresh(refetchMovie, refetchReviews);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag: handlePullEndDrag,
    androidPullProps,
  } = usePullToRefresh(onRefresh, refreshing);
  const movieForAction = movie ?? { id: movieId, release_date: null, in_theaters: false };
  const {
    actionType,
    isActive: isActionActive,
    onPress: handleAction,
  } = useMovieAction(movieForAction, movie?.platforms.length ?? 0);
  const [activeTab, setActiveTab] = useState<TabName>('overview');

  // --- Scroll animation state ---
  const scrollOffset = useSharedValue(0);
  const titleWidth = useSharedValue(200);
  const titleHeight = useSharedValue(28);
  const navLeftWidth = useSharedValue(0);
  const navRightWidth = useSharedValue(0);
  const {
    scrollRef,
    contentMinHeight,
    handleLayout,
    handleScrollEndDrag: handleSnapEndDrag,
    handleMomentumEnd,
  } = useSnapScroll({ scrollOffset, snapThreshold: DETAIL_SCROLL_THRESHOLD });

  const heroPosterCX = 16 + DETAIL_POSTER_EXPANDED_W / 2;
  const heroTotalH = DETAIL_HERO_HEIGHT + DETAIL_HERO_INFO_OFFSET;
  const heroPosterCY = insets.top + heroTotalH - 16 - DETAIL_POSTER_EXPANDED_H / 2;
  const navCenterY = insets.top + DETAIL_NAV_ROW_HEIGHT / 2;

  const {
    animatedPosterStyle,
    animatedTitleStyle,
    titleColorStyle,
    heroInfoFadeStyle,
    navBarBgStyle,
    titleMaxWidthStyle,
  } = useDetailScrollAnimations({
    scrollOffset,
    titleWidth,
    titleHeight,
    navLeftWidth,
    navRightWidth,
    screenWidth,
    heroPosterCX,
    heroPosterCY,
    navCenterY,
    textPrimaryColor: theme.textPrimary,
  });

  const onTitleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      titleWidth.value = e.nativeEvent.layout.width;
      titleHeight.value = e.nativeEvent.layout.height;
    },
    [titleWidth, titleHeight],
  );
  const onNavLeftLayout = useCallback(
    (e: LayoutChangeEvent) => {
      navLeftWidth.value = e.nativeEvent.layout.width;
    },
    [navLeftWidth],
  );
  const onNavRightLayout = useCallback(
    (e: LayoutChangeEvent) => {
      navRightWidth.value = e.nativeEvent.layout.width;
    },
    [navRightWidth],
  );

  // @sideeffect UI-thread scroll handler — scrollOffset on UI thread for 60fps animations
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollOffset.value = e.contentOffset.y;
      runOnJS(handlePullScroll)({ nativeEvent: e } as any);
    },
    onBeginDrag: () => {
      runOnJS(handleScrollBeginDrag)();
    },
    onEndDrag: (e) => {
      runOnJS(handleSnapEndDrag)({ nativeEvent: e } as any);
      runOnJS(handlePullEndDrag)({ nativeEvent: e } as any);
    },
    onMomentumEnd: (e) => {
      runOnJS(handleMomentumEnd)({ nativeEvent: e } as any);
    },
  });

  const tabs: DisplayTab[] = ['overview', 'media', 'cast', 'reviews'];

  if (movieLoading || !movie) return <MovieDetailSkeleton />;

  const handleShare = async () => {
    const year = extractReleaseYear(movie.release_date);
    await shareContent({
      type: 'movie',
      id: movie.id,
      title: movie.title,
      subtitle: year ? String(year) : undefined,
      rating: movie.rating > 0 ? `${movie.rating}★` : undefined,
    });
  };

  const movieStatus = deriveMovieStatus(movie, movie.platforms.length);
  const releaseYear = extractReleaseYear(movie.release_date);
  const tabLabels: Record<DisplayTab, string> = {
    overview: t('movie.overview'),
    media: t('movieDetail.media'),
    cast: t('movie.cast'),
    reviews: t('movie.reviews'),
  };
  const handleTabPress = (tab: DisplayTab) => {
    if (tab === 'media') router.push(`/movie/${id}/media`);
    else setActiveTab(tab);
  };

  const posterUri =
    getImageUrl(movie.poster_url, 'sm', posterBucket(movie.poster_image_type)) ??
    PLACEHOLDER_POSTER;

  return (
    <View style={styles.screen}>
      <SafeAreaCover />

      {/* Floating poster — animates from hero to nav bar */}
      <Animated.View style={[styles.floatingPoster, animatedPosterStyle]} pointerEvents="none">
        <Image
          source={{ uri: posterUri }}
          style={styles.floatingPosterImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </Animated.View>

      {/* Floating badge + title — animates from hero to nav bar */}
      <Animated.View style={[styles.floatingTitle, animatedTitleStyle]} pointerEvents="none">
        <Animated.View style={[styles.statusBadge, heroInfoFadeStyle]}>
          <Text style={styles.statusBadgeText}>{getMovieStatusLabel(movieStatus)}</Text>
        </Animated.View>
        <Animated.Text
          style={[styles.floatingTitleText, titleColorStyle, titleMaxWidthStyle]}
          numberOfLines={1}
          onLayout={onTitleLayout}
        >
          {movie.title}
        </Animated.Text>
      </Animated.View>

      {/* Fixed nav bar at top — buttons always visible, background fades in on scroll */}
      <MovieDetailHeader
        insetsTop={insets.top}
        actionType={actionType}
        isActionActive={isActionActive}
        onBack={() => router.back()}
        onShare={handleShare}
        onToggleAction={handleAction}
        movieTitle={movie.title}
        navBarBgStyle={navBarBgStyle}
        onNavLeftLayout={onNavLeftLayout}
        onNavRightLayout={onNavRightLayout}
      />

      <Animated.ScrollView
        ref={scrollRef as React.RefObject<Animated.ScrollView>}
        contentContainerStyle={{ paddingTop: insets.top, minHeight: contentMinHeight }}
        onLayout={handleLayout}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        {...androidPullProps}
      >
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          refreshing={refreshing}
        />

        <MovieHeroSection
          movie={movie}
          movieStatus={movieStatus}
          releaseYear={releaseYear}
          scrollOffset={scrollOffset}
          heroInfoFadeStyle={heroInfoFadeStyle}
        />

        <WatchOnSection
          platforms={movie.platforms}
          movieStatus={movieStatus}
          releaseDate={movie.release_date}
        />

        <View style={{ marginTop: 24 }}>
          <AnimatedTabBar
            tabs={tabs}
            labels={tabLabels}
            activeTab={activeTab}
            onTabPress={handleTabPress}
          />
        </View>

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
              onWriteReview={gate(() => review.setShowModal(true))}
              onHelpful={gate((reviewId: string) =>
                review.helpfulMutation.mutate({ userId, reviewId }),
              )}
              editorialReview={editorialReview}
              onPollVote={gate((vote: 'agree' | 'disagree') =>
                pollVoteMutation.mutate({
                  editorialReviewId: editorialReview!.id,
                  vote,
                  previousVote: editorialReview!.user_poll_vote,
                }),
              )}
            />
          )}
        </View>
      </Animated.ScrollView>

      <ReviewModal
        visible={review.showModal}
        movieTitle={movie.title}
        posterUrl={movie.poster_url}
        posterImageType={movie.poster_image_type}
        releaseYear={releaseYear}
        director={movie.director}
        reviewRating={review.rating}
        reviewTitle={review.title}
        reviewBody={review.body}
        containsSpoiler={review.containsSpoiler}
        craftRatings={review.craftRatings}
        onRatingChange={review.setRating}
        onTitleChange={review.setTitle}
        onBodyChange={review.setBody}
        onSpoilerToggle={() => review.setContainsSpoiler(!review.containsSpoiler)}
        onCraftRatingChange={(craft, rating) =>
          review.setCraftRatings((prev) => ({ ...prev, [craft]: rating }))
        }
        onSubmit={gate(review.submit)}
        onClose={() => review.setShowModal(false)}
      />
    </View>
  );
}
