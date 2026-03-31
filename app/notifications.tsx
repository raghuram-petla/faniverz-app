import { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import ScreenHeader from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import {
  useNotifications,
  useUnreadCount,
  useNotificationMutations,
} from '@/features/notifications/hooks';
import { Notification } from '@/types';
import { PlatformBadge } from '@/components/ui/PlatformBadge';
import { formatRelativeTime } from '@/utils/formatDate';
import { getImageUrl, posterBucket } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { createStyles } from './notifications.styles';

type NotificationIconConfig = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  bg: string;
};

// @edge: unknown notification types fall back to 'release' icon via ?? operator in NotificationItem
const TYPE_ICON: Record<string, NotificationIconConfig> = {
  release: { name: 'film-outline', bg: palette.purple600 },
  watchlist: { name: 'calendar-outline', bg: palette.blue600 },
  trending: { name: 'trending-up', bg: palette.red600 },
  reminder: { name: 'star-outline', bg: palette.yellow400 },
};

function NotificationItem({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (notification: Notification) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const iconConfig = TYPE_ICON[item.type] ?? TYPE_ICON.release;

  return (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={() => onPress(item)}
      accessibilityLabel={item.title}
    >
      {/* Poster with type icon overlay */}
      <View style={styles.posterContainer}>
        <Image
          source={{
            uri:
              getImageUrl(
                item.movie?.poster_url ?? null,
                'sm',
                posterBucket(item.movie?.poster_image_type),
              ) ?? PLACEHOLDER_POSTER,
          }}
          style={styles.poster}
          contentFit="cover"
        />
        <View style={[styles.typeIconBadge, { backgroundColor: iconConfig.bg }]}>
          <Ionicons name={iconConfig.name} size={12} color={theme.textPrimary} />
        </View>
      </View>

      {/* Text content */}
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemMessage} numberOfLines={2}>
          {item.message}
        </Text>
        {item.type === 'release' && item.platform && (
          <PlatformBadge platform={item.platform} size={20} />
        )}
        <Text style={styles.itemTimestamp}>{formatRelativeTime(item.created_at)}</Text>
      </View>

      {/* Unread indicator */}
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

// @boundary: Notification center — shows release/watchlist/trending/reminder notifications
// @coupling: useNotifications, useUnreadCount, useNotificationMutations from features/notifications
export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  // @assumes: userId is '' when logged out — hooks return empty data for empty userId
  const { data: notifications = [], refetch } = useNotifications(userId);
  const unreadCount = useUnreadCount(userId);
  // @sideeffect: markRead/markAllRead trigger optimistic cache updates via TanStack Query
  const { markRead, markAllRead } = useNotificationMutations();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    refreshControl,
  } = usePullToRefresh(onRefresh, refreshing);

  // @sideeffect: marks as read (if unread) then navigates to movie detail
  // @nullable: notification.movie_id may be null — only navigates when present
  // @contract: isPending guard prevents duplicate mark-read calls from rapid taps
  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read && !markRead.isPending) {
      markRead.mutate(notification.id);
    }
    if (notification.movie_id) {
      router.push(`/movie/${notification.movie_id}`);
    }
  };

  // @edge: no-op when there are no unread notifications or user is logged out
  const renderSeparator = useCallback(() => <View style={styles.separator} />, [styles.separator]);

  const handleMarkAllRead = () => {
    /* istanbul ignore else */
    if (userId && unreadCount > 0) {
      markAllRead.mutate(userId, {
        onError: () => Alert.alert(t('common.error'), t('common.somethingWentWrong')),
      });
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top + 12 }]}>
        <ScreenHeader
          title={t('notifications.title')}
          backIcon="arrow-back"
          titleBadge={
            unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )
          }
          rightAction={
            <TouchableOpacity
              onPress={handleMarkAllRead}
              disabled={unreadCount === 0}
              accessibilityLabel="Mark all as read"
            >
              <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>
                {t('notifications.markAllRead')}
              </Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Notification list */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={handleNotificationPress} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title={t('notifications.empty')}
            subtitle={t('notifications.emptySubtitle')}
          />
        }
        contentContainerStyle={
          notifications.length === 0 ? styles.listEmptyContent : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={renderSeparator}
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
      />
    </View>
  );
}
