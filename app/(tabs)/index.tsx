import { useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  usePersonalizedFeed,
  useVoteFeedItem,
  useRemoveFeedVote,
  useUserVotes,
  useEntityFollows,
  useFollowEntity,
  useUnfollowEntity,
} from '@/features/feed';
import { useFeedStore } from '@/stores/useFeedStore';
import { useActiveVideo } from '@/hooks/useActiveVideo';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedHeader, useCollapsibleHeader } from '@/components/feed/FeedHeader';
import { FeedFilterPills } from '@/components/feed/FeedFilterPills';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollToTop } from '@react-navigation/native';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import { FeedContentSkeleton } from '@/components/feed/FeedContentSkeleton';
import { deriveEntityType, getEntityId, FEED_PILLS } from '@/constants/feedHelpers';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';

// @boundary Home tab — personalized feed with collapsible header, video autoplay, voting, and follow
// @coupling useFeedStore (Zustand), usePersonalizedFeed, useActiveVideo, useEntityFollows
export default function FeedScreen() {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createFeedStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  // @sync filter persists in Zustand store — survives tab switches but not app restarts
  const { filter, setFilter } = useFeedStore();
  // @sideeffect useCollapsibleHeader attaches animated translateY to scroll position
  const { headerTranslateY, totalHeaderHeight, handleScroll } = useCollapsibleHeader(insets.top);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    usePersonalizedFeed(filter);
  // @sideeffect vote/remove mutations use optimistic updates via TanStack Query cache
  const voteMutation = useVoteFeedItem();
  const removeMutation = useRemoveFeedVote();
  // @sync activeVideoId tracks the single auto-playing video based on scroll position
  const { activeVideoId, registerVideoLayout, handleScrollForVideo } = useActiveVideo();
  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  // @boundary gate() wraps callbacks — redirects guests to login instead of executing the action
  const { gate } = useAuthGate();
  const { user } = useAuth();
  const router = useRouter();

  // @invariant Deduplicates by item.id — infinite query pages can overlap during refetch
  const allItems = useMemo(() => {
    const flat = data?.pages.flatMap((page) => page) ?? [];
    const seen = new Set<string>();
    return flat.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data?.pages]);
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
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // @contract Toggle behavior: re-upvoting removes the vote; first upvote or switching from down creates new vote
  // @nullable prev can be null (no vote), 'up', or 'down'
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
      Share.share({ message: `${item.title} — Check it out on Faniverz!` }).catch(() => {});
    },
    [allItems],
  );

  // @contract: isPending guards prevent duplicate follow/unfollow API calls from rapid taps in the feed
  const handleFollow = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      if (followMutation.isPending || unfollowMutation.isPending) return;
      followMutation.mutate({ entityType, entityId });
    },
    [followMutation, unfollowMutation],
  );

  const handleUnfollow = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      if (followMutation.isPending || unfollowMutation.isPending) return;
      unfollowMutation.mutate({ entityType, entityId });
    },
    [followMutation, unfollowMutation],
  );

  // @edge If entityId matches current user, navigates to own profile instead of user/:id
  // @assumes entityType is always one of 'user' | 'movie' | 'actor' | 'production_house'
  const handleEntityPress = useCallback(
    (entityType: FeedEntityType, entityId: string) => {
      if (entityType === 'user') {
        if (entityId === user?.id) {
          router.push('/profile' as Parameters<typeof router.push>[0]);
        } else {
          router.push(`/user/${entityId}` as Parameters<typeof router.push>[0]);
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

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={styles.screen}>
      <SafeAreaCover />

      <FeedHeader
        insetTop={insets.top}
        headerTranslateY={headerTranslateY}
        totalHeaderHeight={totalHeaderHeight}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: totalHeaderHeight }]}
        showsVerticalScrollIndicator={false}
        // @sync Three scroll handlers chained: pull-to-refresh, collapsible header, infinite load + video autoplay
        onScroll={(e) => {
          handlePullScroll(e);
          handleScroll(e);
          // @edge 300px threshold triggers next page fetch before user reaches the bottom
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 300) {
            loadMore();
          }
          handleScrollForVideo(contentOffset.y, layoutMeasurement.height);
        }}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          refreshing={refreshing}
        />

        {/* Filter pills */}
        <FeedFilterPills filter={filter} setFilter={setFilter} styles={styles} />

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
                onUpvote={gate(handleUpvote)} /* @boundary gate wraps — guests see login prompt */
                onDownvote={gate(handleDownvote)}
                onComment={handleComment}
                onShare={handleShare}
                isVideoActive={activeVideoId === item.id}
                onVideoLayout={item.youtube_id ? registerVideoLayout : undefined}
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
