import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useProductionHouseDetail } from '@/features/productionHouses/hooks';
import { useEntityFollows, useFollowEntity, useUnfollowEntity } from '@/features/feed';
import { useAuthGate } from '@/hooks/useAuthGate';
import { HomeButton } from '@/components/common/HomeButton';
import { FollowButton } from '@/components/feed/FollowButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { createProductionHouseStyles } from '@/styles/productionHouseDetail.styles';
import { getImageUrl } from '@shared/imageUrl';

export default function ProductionHouseDetailScreen() {
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      onScroll={handlePullScroll}
      onScrollEndDrag={handleScrollEndDrag}
      scrollEventThrottle={16}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        refreshing={refreshing}
      />

      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <HomeButton />
      </View>

      <View style={styles.logoCenter}>
        {house.logo_url ? (
          <Image
            source={{ uri: getImageUrl(house.logo_url, 'sm')! }}
            style={styles.logoImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.logoFallback}>
            <Ionicons name="business" size={40} color={colors.gray500} />
          </View>
        )}
      </View>

      <Text style={styles.name}>{house.name}</Text>

      <View style={styles.followRow}>
        <FollowButton
          isFollowing={isFollowing}
          onPress={handleFollowToggle}
          entityName={house.name}
        />
      </View>

      {house.description ? <Text style={styles.description}>{house.description}</Text> : null}

      <Text style={styles.sectionTitle}>Movies ({movies.length})</Text>

      {movies.length === 0 ? (
        <EmptyState
          icon="film-outline"
          title="No movies yet"
          subtitle="Movies from this production house will appear here."
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
                  source={{ uri: getImageUrl(movie.poster_url, 'sm') ?? undefined }}
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
    </ScrollView>
  );
}
