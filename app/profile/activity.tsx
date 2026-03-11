import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingCenter } from '@/components/common/LoadingCenter';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
import { useUserActivity, type ActivityFilter, type UserActivity } from '@/features/profile';
import { ActivityItem } from '@/components/profile/ActivityItem';

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'votes', label: 'Votes' },
  { key: 'follows', label: 'Follows' },
  { key: 'comments', label: 'Comments' },
];

export default function ActivityScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const { data, isLoading, refetch, fetchNextPage, hasNextPage } = useUserActivity(filter);
  const activities = useMemo(() => data?.pages.flatMap((p) => p) ?? [], [data]);

  const { refreshing, onRefresh } = useRefresh(async () => {
    await refetch();
  });
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
  );

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
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Activity" />

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <LoadingCenter />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityItem activity={item} onPress={() => handleActivityPress(item)} />
          )}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          onScroll={handlePullScroll}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
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
              title="No activity yet"
              subtitle="Your votes, follows, and comments will appear here"
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
    filterTextActive: { color: '#fff' },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
  });
