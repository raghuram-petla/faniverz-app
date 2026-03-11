import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
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

export default function ProductionHouseDetailScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createProductionHouseStyles(theme);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { house, movies, isLoading, refetch } = useProductionHouseDetail(id ?? '');
  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  const { gate } = useAuthGate();
  const { refreshing, onRefresh } = useRefresh(async () => {
    await refetch();
  });
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
  );

  const isFollowing = followSet.has(`production_house:${id}`);

  const handleFollowToggle = gate(() => {
    if (isFollowing) {
      unfollowMutation.mutate({ entityType: 'production_house', entityId: id ?? '' });
    } else {
      followMutation.mutate({ entityType: 'production_house', entityId: id ?? '' });
    }
  });

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.red600} testID="loading-indicator" />
        </View>
      </View>
    );
  }

  if (!house) return null;

  const renderLogo = (size: number) =>
    house.logo_url ? (
      <Image
        source={{ uri: getImageUrl(house.logo_url, 'sm')! }}
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
        house.description ? <Text style={styles.description}>{house.description}</Text> : null
      }
      onScroll={handlePullScroll}
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
              const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
              return (
                <TouchableOpacity
                  key={movie.id}
                  style={styles.movieCard}
                  onPress={() => router.push(`/movie/${movie.id}`)}
                  activeOpacity={0.7}
                  testID={`movie-card-${movie.id}`}
                >
                  <Image
                    source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? PLACEHOLDER_POSTER }}
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
