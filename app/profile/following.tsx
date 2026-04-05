import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
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
import { getImageUrl, entityTypeToBucket } from '@shared/imageUrl';
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
  /** @contract editing mode toggles unfollow badges on poster cards */
  const [editing, setEditing] = useState(false);
  // @contract: pass refetch directly — useRefresh syncs via ref so no stale closure risk
  const { refreshing, onRefresh } = useRefresh(refetch);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    androidPullProps,
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
  // @contract: mutation is idempotent (delete) so no isPending guard needed
  const handleUnfollow = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      if (!user?.id) return;
      unfollowMutation.mutate({ entityType, entityId });
    },
    [user?.id, unfollowMutation],
  );

  /** @contract renders a poster card; unfollow badge only visible in editing mode */
  const renderItem = useCallback(
    ({ item }: { item: EnrichedFollow }) => {
      const placeholder = item.entity_type === 'actor' ? PLACEHOLDER_PHOTO : PLACEHOLDER_POSTER;
      const imageUrl =
        getImageUrl(item.image_url, 'sm', entityTypeToBucket(item.entity_type)) ?? placeholder;
      return (
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => handleEntityPress(item.entity_type, item.entity_id)}
          accessibilityLabel={item.name}
        >
          {/** @invariant posterSlot keeps 2:3 ratio so actors and movies align */}
          <View style={styles.posterSlot}>
            <Image
              source={{ uri: imageUrl }}
              style={item.entity_type === 'actor' ? styles.posterRound : styles.posterImage}
              contentFit="cover"
            />
            {editing && (
              <TouchableOpacity
                style={styles.unfollowBadge}
                onPress={() => handleUnfollow(item.entity_type, item.entity_id)}
                accessibilityLabel={t('common.unfollowName', { name: item.name })}
              >
                <Ionicons name="close-circle" size={22} color={palette.red500} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.posterName} numberOfLines={1}>
            {item.name}
          </Text>
        </TouchableOpacity>
      );
    },
    [styles, handleEntityPress, handleUnfollow, t, editing],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerWrapper, { paddingTop: insets.top + 12 }]}>
        <ScreenHeader
          title={t('profile.following')}
          rightAction={
            follows.length > 0 ? (
              <TouchableOpacity onPress={() => setEditing((e) => !e)}>
                <Text style={editing ? styles.doneText : styles.editText}>
                  {editing ? t('common.done') : t('common.edit')}
                </Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
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
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={filter === 'all' ? t('profile.noFollowing') : t('profile.noFollowingFiltered')}
              subtitle={
                filter === 'all'
                  ? t('profile.noFollowingSubtitle')
                  : t('profile.noFollowingFilteredSubtitle')
              }
            />
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyContent : styles.listContent}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          onScroll={handlePullScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
          {...androidPullProps}
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
    editText: { fontSize: 15, fontWeight: '600', color: palette.red500 },
    doneText: { fontSize: 15, fontWeight: '700', color: palette.red500 },
    filterText: { fontSize: 13, fontWeight: '600', color: t.textSecondary },
    filterTextActive: { color: palette.white },
    listContent: { paddingHorizontal: 12, paddingBottom: 40 },
    emptyContent: { flex: 1 },
    /** @sync columnWrapper gap must match gridItem paddingHorizontal for even spacing */
    columnWrapper: { paddingHorizontal: 4 },
    gridItem: {
      flex: 1,
      maxWidth: '33.33%',
      alignItems: 'center',
      paddingHorizontal: 4,
      marginBottom: 12,
    },
    /** @invariant fixed 2:3 slot so actor circles and movie posters share the same row height */
    posterSlot: {
      width: '100%',
      aspectRatio: 2 / 3,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      position: 'relative' as const,
    },
    /** @contract poster fills the entire slot */
    posterImage: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
      backgroundColor: t.input,
    },
    /** @edge actor circle is 75% width, centered within the 2:3 slot */
    posterRound: {
      width: '75%',
      aspectRatio: 1,
      borderRadius: 999,
      backgroundColor: t.input,
    },
    unfollowBadge: {
      position: 'absolute' as const,
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 10,
      padding: 2,
    },
    posterName: {
      fontSize: 11,
      fontWeight: '500',
      color: t.textPrimary,
      textAlign: 'center' as const,
      marginTop: 4,
      width: '100%',
    },
  });
