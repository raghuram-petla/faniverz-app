import { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useProductionHouseDetail } from '@/features/productionHouses/hooks';
import { useEntityFollows, useFollowEntity, useUnfollowEntity } from '@/features/feed';
import { useAuthGate } from '@/hooks/useAuthGate';
import { CollapsibleProfileLayout } from '@/components/common/CollapsibleProfileLayout';
import { FollowButton } from '@/components/feed/FollowButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { createProductionHouseStyles } from '@/styles/productionHouseDetail.styles';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { extractReleaseYear } from '@/utils/formatDate';
import { ProductionHouseDetailSkeleton } from '@/components/productionHouse/ProductionHouseDetailSkeleton';
import ScreenHeader from '@/components/common/ScreenHeader';

// @boundary: Production house detail — collapsible header layout with movie filmography grid
// @coupling: useProductionHouseDetail, useEntityFollows, useFollowEntity, useUnfollowEntity
export default function ProductionHouseDetailScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createProductionHouseStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // @boundary: useProductionHouseDetail fetches house metadata + associated movies in one query
  const { house, movies, isLoading, refetch } = useProductionHouseDetail(id ?? '');
  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  const { gate } = useAuthGate();
  const { refreshing, onRefresh } = useRefresh(async () => {
    await refetch();
  });
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);

  // @coupling: followSet uses "entityType:entityId" composite key format
  const isFollowing = followSet.has(`production_house:${id}`);

  // @contract: gate() redirects to login if unauthenticated; otherwise toggles follow state
  // @contract: isPending guard prevents duplicate follow/unfollow calls from rapid taps
  const handleFollowToggle = gate(() => {
    if (followMutation.isPending || unfollowMutation.isPending) return;
    if (isFollowing) {
      unfollowMutation.mutate({
        entityType: 'production_house',
        entityId: id ?? /* istanbul ignore next */ '',
      });
    } else {
      followMutation.mutate({
        entityType: 'production_house',
        entityId: id ?? /* istanbul ignore next */ '',
      });
    }
  });

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ProductionHouseDetailSkeleton />
      </View>
    );
  }

  if (!house) {
    return (
      <View style={styles.screen}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
          <ScreenHeader title="" />
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.textTertiary} />
            <Text style={{ color: theme.textTertiary, marginTop: 8, fontSize: 16 }}>
              {t('common.noResults')}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // @nullable: house.logo_url may be null — renders a placeholder icon when missing
  const renderLogo = (size: number) =>
    house.logo_url ? (
      <Image
        source={{
          uri:
            getImageUrl(house.logo_url, 'sm', 'PRODUCTION_HOUSES') ??
            /* istanbul ignore next */ PLACEHOLDER_POSTER,
        }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={200}
      />
    ) : (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.input,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="business" size={size * 0.4} color={colors.gray500} />
      </View>
    );

  return (
    <CollapsibleProfileLayout
      name={house.name}
      renderImage={renderLogo}
      onBack={() => router.back()}
      rightContent={
        <FollowButton
          isFollowing={isFollowing}
          onPress={handleFollowToggle}
          entityName={house.name}
        />
      }
      heroContent={
        house.description ? (
          <Text style={styles.description} numberOfLines={4}>
            {house.description}
          </Text>
        ) : null
      }
      onScroll={handlePullScroll}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      scrollHeader={
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          refreshing={refreshing}
        />
      }
    >
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={styles.sectionTitle}>
          {t('productionHouse.movies')} ({movies.length})
        </Text>

        {movies.length === 0 ? (
          <EmptyState
            icon="film-outline"
            title={t('productionHouse.noMovies')}
            subtitle={t('productionHouse.noMoviesSubtitle')}
          />
        ) : (
          <View style={styles.moviesList}>
            {movies.map((movie) => {
              const year = extractReleaseYear(movie.release_date);
              return (
                <TouchableOpacity
                  key={movie.id}
                  style={styles.movieCard}
                  onPress={() => router.push(`/movie/${movie.id}`)}
                  activeOpacity={0.7}
                  testID={`movie-card-${movie.id}`}
                >
                  <Image
                    source={{
                      uri: getImageUrl(movie.poster_url, 'sm', 'POSTERS') ?? PLACEHOLDER_POSTER,
                    }}
                    style={styles.moviePoster}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.movieInfo}>
                    <Text style={styles.movieTitle} numberOfLines={2}>
                      {movie.title}
                    </Text>
                    {year && <Text style={styles.movieYear}>{year}</Text>}
                    {movie.rating > 0 && (
                      <View style={styles.movieRatingRow}>
                        <Ionicons name="star" size={12} color={colors.yellow400} />
                        <Text style={styles.movieRatingValue}>{movie.rating}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </CollapsibleProfileLayout>
  );
}
