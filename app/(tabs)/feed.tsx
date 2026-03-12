import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  useNewsFeed,
  useVoteFeedItem,
  useRemoveFeedVote,
  useUserVotes,
  useEntityFollows,
  useFollowEntity,
  useUnfollowEntity,
} from '@/features/feed';
import { useFeedStore } from '@/stores/useFeedStore';
import { deriveEntityType, getEntityId, FEED_PILLS } from '@/constants/feedHelpers';
import { FeedCard } from '@/components/feed/FeedCard';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useTranslation } from 'react-i18next';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import { FeedContentSkeleton } from '@/components/feed/FeedContentSkeleton';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';
import type { FeedFilterOption } from '@/types';

export default function FeedScreen() {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createFeedStyles(theme);
  const insets = useSafeAreaInsets();
  const { filter, setFilter } = useFeedStore();
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    useNewsFeed(filter);
  const voteMutation = useVoteFeedItem();
  const removeMutation = useRemoveFeedVote();
  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  const { gate } = useAuthGate();
  const { user } = useAuth();
  const router = useRouter();

  const allItems = useMemo(() => data?.pages.flatMap((page) => page) ?? [], [data?.pages]);
  const feedItemIds = useMemo(() => allItems.map((i) => i.id), [allItems]);
  const { data: userVotes = {}, refetch: refetchVotes } = useUserVotes(feedItemIds);
  const { refreshing, onRefresh } = useRefresh(refetch, refetchVotes);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleUpvote = useCallback(
    (itemId: string) => {
      const prev = userVotes[itemId] ?? null;
      if (prev === 'up') {
        removeMutation.mutate({ feedItemId: itemId, previousVote: prev });
      } else {
        voteMutation.mutate({ feedItemId: itemId, voteType: 'up', previousVote: prev });
      }
    },
    [userVotes, voteMutation, removeMutation],
  );

  const handleDownvote = useCallback(
    (itemId: string) => {
      const prev = userVotes[itemId] ?? null;
      if (prev === 'down') {
        removeMutation.mutate({ feedItemId: itemId, previousVote: prev });
      } else {
        voteMutation.mutate({ feedItemId: itemId, voteType: 'down', previousVote: prev });
      }
    },
    [userVotes, voteMutation, removeMutation],
  );

  const handleShare = useCallback(
    (itemId: string) => {
      const item = allItems.find((i) => i.id === itemId);
      if (!item) return;
      Share.share({ message: `${item.title} — Check it out on Faniverz!` });
    },
    [allItems],
  );

  const handleFollow = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      followMutation.mutate({ entityType, entityId });
    },
    [followMutation],
  );

  const handleUnfollow = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      unfollowMutation.mutate({ entityType, entityId });
    },
    [unfollowMutation],
  );

  const handleEntityPress = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      if (entityType === 'user') {
        if (entityId === user?.id) {
          router.push('/profile' as Parameters<typeof router.push>[0]);
        } else {
          Alert.alert(t('home.comingSoon'), t('feed.userProfilesNotAvailable'));
        }
        return;
      }
      const routes: Record<string, string> = {
        movie: `/movie/${entityId}`,
        actor: `/actor/${entityId}`,
        production_house: `/production-house/${entityId}`,
      };
      router.push(routes[entityType] as Parameters<typeof router.push>[0]);
    },
    [router, user?.id],
  );

  const handleFeedItemPress = useCallback(
    (item: NewsFeedItem) => {
      router.push(`/post/${item.id}` as Parameters<typeof router.push>[0]);
    },
    [router],
  );

  const handleComment = useCallback(
    (itemId: string) => {
      router.push(`/post/${itemId}` as Parameters<typeof router.push>[0]);
    },
    [router],
  );

  return (
    <View style={styles.screen}>
      <SafeAreaCover />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerIconBadge}>
          <Ionicons name="newspaper" size={20} color={colors.white} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>{t('feed.newsFeed')}</Text>
          <Text style={styles.headerSubtitle}>{t('feed.latestUpdates')}</Text>
        </View>
      </View>

      {/* Filter pills */}
      <FilterPills filter={filter} setFilter={setFilter} styles={styles} />

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          handlePullScroll(e);
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 300) {
            loadMore();
          }
        }}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={400}
      >
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          refreshing={refreshing}
        />
        {isLoading ? (
          <FeedContentSkeleton />
        ) : allItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color={colors.gray500} />
            <Text style={styles.emptyTitle}>{t('feed.noUpdates')}</Text>
            <Text style={styles.emptySubtitle}>
              {filter !== 'all'
                ? t('feed.noFilterContent', {
                    filter: FEED_PILLS.find((p) => p.value === filter)?.label ?? filter,
                  })
                : t('feed.checkBackSoon')}
            </Text>
          </View>
        ) : (
          <View style={styles.feedList}>
            {allItems.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                onPress={handleFeedItemPress}
                onEntityPress={handleEntityPress}
                userVote={userVotes[item.id] ?? null}
                onUpvote={gate(handleUpvote)}
                onDownvote={gate(handleDownvote)}
                onComment={handleComment}
                onShare={handleShare}
                isFollowing={followSet.has(`${deriveEntityType(item)}:${getEntityId(item)}`)}
                onFollow={gate(handleFollow)}
                onUnfollow={gate(handleUnfollow)}
              />
            ))}
            {isFetchingNextPage ? <ActivityIndicator size="small" color={colors.red600} /> : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface FilterPillsProps {
  filter: FeedFilterOption;
  setFilter: (f: FeedFilterOption) => void;
  styles: ReturnType<typeof createFeedStyles>;
}

function FilterPills({ filter, setFilter, styles }: FilterPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.pillScroll}
      contentContainerStyle={styles.pillScrollContent}
    >
      {FEED_PILLS.map((pill) => {
        const active = filter === pill.value;
        return (
          <TouchableOpacity
            key={pill.value}
            style={[
              styles.pill,
              active
                ? { backgroundColor: pill.activeColor, borderColor: pill.activeColor }
                : styles.pillInactive,
            ]}
            onPress={() => setFilter(pill.value)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filter by ${pill.label}`}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{pill.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
