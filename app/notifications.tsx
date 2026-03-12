import { useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';
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
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

type NotificationIconConfig = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  bg: string;
};

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
          source={{ uri: getImageUrl(item.movie?.poster_url ?? null, 'sm') ?? PLACEHOLDER_POSTER }}
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

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { data: notifications = [], refetch } = useNotifications(userId);
  const unreadCount = useUnreadCount(userId);
  const { markRead, markAllRead } = useNotificationMutations();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    if (notification.movie_id) {
      router.push(`/movie/${notification.movie_id}`);
    }
  };

  const handleMarkAllRead = () => {
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
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.background,
    },

    // Header
    headerWrapper: {
      paddingBottom: 16,
      paddingHorizontal: 16,
    },
    unreadBadge: {
      backgroundColor: palette.red600,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.white,
    },
    markAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.red500,
    },
    markAllTextDisabled: {
      color: t.textTertiary,
    },

    // List
    listContent: {
      paddingBottom: 40,
    },
    listEmptyContent: {
      flex: 1,
    },

    // Notification item
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    itemUnread: {
      backgroundColor: t.surfaceElevated,
    },
    posterContainer: {
      position: 'relative',
    },
    poster: {
      width: 64,
      height: 96,
      borderRadius: 12,
      backgroundColor: t.input,
    },
    typeIconBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: t.background,
    },
    itemContent: {
      flex: 1,
      gap: 4,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: t.textPrimary,
    },
    itemMessage: {
      fontSize: 13,
      color: t.textSecondary,
      lineHeight: 18,
    },
    itemTimestamp: {
      fontSize: 12,
      color: t.textTertiary,
      marginTop: 2,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.red500,
      alignSelf: 'center',
      flexShrink: 0,
    },

    // Separator
    separator: {
      height: 1,
      backgroundColor: t.border,
      marginHorizontal: 16,
    },
  });
