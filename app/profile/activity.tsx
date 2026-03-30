import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProfileListSkeleton } from '@/components/profile/ProfileListSkeleton';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSmartPagination } from '@/hooks/useSmartPagination';
import { ACTIVITY_PAGINATION } from '@/constants/paginationConfig';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import { useUserActivity, type ActivityFilter, type UserActivity } from '@/features/profile';
import { ActivityItem } from '@/components/profile/ActivityItem';

const FILTER_KEYS: { key: ActivityFilter; i18nKey: string }[] = [
  { key: 'all', i18nKey: 'common.all' },
  { key: 'votes', i18nKey: 'profile.filterVotes' },
  { key: 'follows', i18nKey: 'profile.filterFollows' },
  { key: 'comments', i18nKey: 'profile.filterComments' },
];

// @boundary: Activity log — chronological list of user actions (votes, follows, comments)
// @coupling: useUserActivity returns paginated data from Supabase user_activity view
export default function ActivityScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<ActivityFilter>('all');

  // @boundary: useUserActivity returns paginated data filtered by activity type
  const {
    allItems: activities,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUserActivity(filter);

  const { refreshing, onRefresh } = useRefresh(async () => {
    await refetch();
  });
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    refreshControl,
  } = usePullToRefresh(onRefresh, refreshing);

  const { handleEndReached, onEndReachedThreshold } = useSmartPagination({
    totalItems: activities.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    config: ACTIVITY_PAGINATION,
  });

  // @edge: unknown entity_type values are silently ignored (no navigation)
  const handleActivityPress = useCallback(
    (activity: UserActivity) => {
      if (activity.entity_type === 'movie') {
        router.push(`/movie/${activity.entity_id}`);
      } else if (activity.entity_type === 'actor') {
        router.push(`/actor/${activity.entity_id}`);
      } else if (activity.entity_type === 'production_house') {
        router.push(`/production-house/${activity.entity_id}`);
      } else if (activity.entity_type === 'feed_item') {
        router.push(`/post/${activity.entity_id}`);
      }
    },
    [router],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScreenHeader title={t('profile.activity')} />

      <View style={styles.filterRow}>
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

      {isLoading ? (
        <ProfileListSkeleton testID="activity-skeleton" />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityItem activity={item} onPress={() => handleActivityPress(item)} />
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={onEndReachedThreshold}
          onScroll={handlePullScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
          ListHeaderComponent={
            <PullToRefreshIndicator
              pullDistance={pullDistance}
              isRefreshing={isRefreshing}
              refreshing={refreshing}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title={t('profile.noActivity')}
              subtitle={t('profile.noActivitySubtitle')}
            />
          }
          contentContainerStyle={activities.length === 0 ? styles.emptyList : undefined}
        />
      )}
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    filterChipActive: { backgroundColor: palette.red600, borderColor: palette.red600 },
    filterText: { fontSize: 13, fontWeight: '500', color: t.textSecondary },
    filterTextActive: { color: palette.white },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
  });
