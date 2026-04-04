import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_1M } from '@/constants/queryConfig';
import { NOTIFICATIONS_PAGINATION } from '@/constants/paginationConfig';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { fetchNotifications, fetchNotificationsPaginated, markAsRead, markAllAsRead } from './api';
import type { Notification } from '@/types';

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => fetchNotifications(userId),
    enabled: !!userId,
    staleTime: STALE_1M,
  });
}

// @coupling: derives unread count by fetching ALL notifications and filtering client-side. This means
// for users with hundreds of notifications, the entire list is downloaded just to compute a badge number.
// No server-side COUNT query exists — if notification volume grows, this becomes a performance bottleneck.
// @assumes: shares the same query cache as useNotifications(userId), so it doesn't trigger a separate fetch.
// @edge: fetchNotifications caps at 200 rows — users with >200 notifications get an undercount of unread. The badge may show fewer unread than actually exist in the DB.
export function useUnreadCount(userId: string) {
  const { data } = useNotifications(userId);
  return data?.filter((n) => !n.read).length ?? 0;
}

/** @contract Paginated version of useNotifications using smart infinite query */
export function useNotificationsPaginated(userId: string) {
  return useSmartInfiniteQuery<Notification>({
    queryKey: ['notifications-paginated', userId],
    queryFn: (offset, limit) => fetchNotificationsPaginated(userId, offset, limit),
    config: NOTIFICATIONS_PAGINATION,
    staleTime: STALE_1M,
    enabled: !!userId,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();

  // @coupling: invalidates ['notifications'] prefix which covers both useNotifications and useNotificationsPaginated caches (different key prefixes: 'notifications' vs 'notifications-paginated'). The paginated cache is NOT invalidated by this prefix match — 'notifications-paginated' does NOT start with 'notifications' as a TanStack Query key segment. The paginated list will show stale read status until its staleTime expires.
  // @contract: invalidates the broad ['notifications'] key prefix on success, which refetches for ALL users
  // if multiple user notification queries are cached. In practice only the current user's query exists,
  // but if the app ever caches another user's notifications (e.g., admin view), both would refetch.
  const markRead = useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      // Silent — background operation; unread dot persists on next load
    },
  });

  const markAllRead = useMutation({
    mutationFn: (userId: string) => markAllAsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      // Silent — caller provides onError override for user feedback
    },
  });

  return { markRead, markAllRead };
}
