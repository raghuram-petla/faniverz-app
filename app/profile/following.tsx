import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProfileListSkeleton } from '@/components/profile/ProfileListSkeleton';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import type { EnrichedFollow, FeedEntityType } from '@shared/types';
import { useEnrichedFollows, useUnfollowEntity } from '@/features/feed';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { PLACEHOLDER_POSTER, PLACEHOLDER_PHOTO } from '@/constants/placeholders';
import { getImageUrl } from '@shared/imageUrl';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

type Filter = 'all' | FeedEntityType;

const FILTER_KEYS: { key: Filter; i18nKey: string }[] = [
  { key: 'all', i18nKey: 'common.all' },
  { key: 'movie', i18nKey: 'search.movies' },
  { key: 'actor', i18nKey: 'search.actors' },
  { key: 'production_house', i18nKey: 'search.studios' },
];

// @boundary: Following list — all entities (movies, actors, production houses) the user follows
// @coupling: useEnrichedFollows, useUnfollowEntity — backed by entity_follows table
export default function FollowingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  // @boundary: useEnrichedFollows joins follow rows with entity names/images from Supabase
  const { data: follows = [], isLoading, refetch } = useEnrichedFollows();
  // @sideeffect: unfollowMutation invalidates the follows query cache on success
  const unfollowMutation = useUnfollowEntity();
  const [filter, setFilter] = useState<Filter>('all');
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

  const filtered = useMemo(
    () => (filter === 'all' ? follows : follows.filter((f) => f.entity_type === filter)),
    [follows, filter],
  );

  // @edge: 'user' type navigates to own profile since follows only contain the current user's follows
  const handleEntityPress = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      const routes: Record<FeedEntityType, string> = {
        movie: `/movie/${entityId}`,
        actor: `/actor/${entityId}`,
        production_house: `/production-house/${entityId}`,
        user: `/profile`,
      };
      router.push(routes[entityType] as Parameters<typeof router.push>[0]);
    },
    [router],
  );

  // @edge: no-op when user is not authenticated (guard against stale session)
  const handleUnfollow = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      if (!user?.id) return;
      unfollowMutation.mutate({ entityType, entityId });
    },
    [user?.id, unfollowMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: EnrichedFollow }) => {
      const placeholder = item.entity_type === 'actor' ? PLACEHOLDER_PHOTO : PLACEHOLDER_POSTER;
      const imageUrl = getImageUrl(item.image_url, 'sm') ?? placeholder;
      return (
        <TouchableOpacity
          style={styles.row}
          onPress={() => handleEntityPress(item.entity_type, item.entity_id)}
          accessibilityLabel={item.name}
        >
          <Image
            source={{ uri: imageUrl }}
            style={[styles.rowImage, item.entity_type === 'actor' ? styles.round : styles.square]}
            contentFit="cover"
          />
          <View style={styles.rowInfo}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowType}>
              {t(
                `common.entityType${item.entity_type === 'movie' ? 'Movie' : item.entity_type === 'actor' ? 'Actor' : 'ProductionHouse'}`,
              )}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.unfollowButton}
            onPress={() => handleUnfollow(item.entity_type, item.entity_id)}
            accessibilityLabel={t('common.unfollowName', { name: item.name })}
          >
            <Ionicons name="close-circle-outline" size={20} color={palette.red500} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [styles, handleEntityPress, handleUnfollow],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerWrapper, { paddingTop: insets.top + 12 }]}>
        <ScreenHeader title={t('profile.following')} />
        <View style={styles.filters}>
          {FILTER_KEYS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {t(f.i18nKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ProfileListSkeleton testID="following-skeleton" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.entity_type}:${item.entity_id}`}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={t('profile.noFollowing')}
              subtitle={t('profile.noFollowingSubtitle')}
            />
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyContent : styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onScroll={handlePullScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <PullToRefreshIndicator
              pullDistance={pullDistance}
              isRefreshing={isRefreshing}
              refreshing={refreshing}
            />
          }
        />
      )}
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    headerWrapper: { paddingHorizontal: 16, paddingBottom: 8 },
    centered: { paddingVertical: 64, alignItems: 'center' },
    filters: { flexDirection: 'row', gap: 8, marginTop: 12 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: t.input,
    },
    filterChipActive: { backgroundColor: palette.red600 },
    filterText: { fontSize: 13, fontWeight: '600', color: t.textSecondary },
    filterTextActive: { color: palette.white },
    listContent: { paddingBottom: 40 },
    emptyContent: { flex: 1 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    rowImage: { width: 48, height: 48, backgroundColor: t.input },
    round: { borderRadius: 24 },
    square: { borderRadius: 10 },
    rowInfo: { flex: 1 },
    rowName: { fontSize: 15, fontWeight: '600', color: t.textPrimary },
    rowType: { fontSize: 12, color: t.textTertiary, textTransform: 'capitalize', marginTop: 2 },
    unfollowButton: { padding: 8 },
    separator: { height: 1, backgroundColor: t.border, marginHorizontal: 16 },
  });
