import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import {
  useNotifications,
  useUnreadCount,
  useNotificationMutations,
} from '@/features/notifications/hooks';
import { Notification } from '@/types';

type NotificationIconConfig = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  bg: string;
};

const TYPE_ICON: Record<string, NotificationIconConfig> = {
  release: { name: 'film-outline', bg: colors.purple600 },
  watchlist: { name: 'calendar-outline', bg: colors.blue600 },
  trending: { name: 'trending-up', bg: colors.red600 },
  reminder: { name: 'star-outline', bg: colors.yellow400 },
};

function formatTimestamp(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationItem({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (notification: Notification) => void;
}) {
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
          source={{ uri: item.movie?.poster_url ?? undefined }}
          style={styles.poster}
          contentFit="cover"
        />
        <View style={[styles.typeIconBadge, { backgroundColor: iconConfig.bg }]}>
          <Ionicons name={iconConfig.name} size={12} color={colors.white} />
        </View>
      </View>

      {/* Text content */}
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.itemTimestamp}>{formatTimestamp(item.created_at)}</Text>
      </View>

      {/* Unread indicator */}
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={48} color={colors.white20} />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>You'll be notified about releases and updates</Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { data: notifications = [] } = useNotifications(userId);
  const unreadCount = useUnreadCount(userId);
  const { markRead, markAllRead } = useNotificationMutations();

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
      markAllRead.mutate(userId);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={handleMarkAllRead}
          disabled={unreadCount === 0}
          accessibilityLabel="Mark all as read"
        >
          <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notification list */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={handleNotificationPress} />
        )}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={
          notifications.length === 0 ? styles.listEmptyContent : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.black50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  unreadBadge: {
    backgroundColor: colors.red600,
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
    color: colors.white,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red500,
  },
  markAllTextDisabled: {
    color: colors.white40,
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
    backgroundColor: colors.white5,
  },
  posterContainer: {
    position: 'relative',
  },
  poster: {
    width: 64,
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.white10,
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
    borderColor: colors.black,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  itemMessage: {
    fontSize: 13,
    color: colors.white60,
    lineHeight: 18,
  },
  itemTimestamp: {
    fontSize: 12,
    color: colors.white40,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red500,
    alignSelf: 'center',
    flexShrink: 0,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: colors.white10,
    marginHorizontal: 16,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.white40,
    textAlign: 'center',
    lineHeight: 20,
  },
});
