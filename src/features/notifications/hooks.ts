import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markAsRead, markAllAsRead } from './api';

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => fetchNotifications(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

// @coupling: derives unread count by fetching ALL notifications and filtering client-side. This means
// for users with hundreds of notifications, the entire list is downloaded just to compute a badge number.
// No server-side COUNT query exists — if notification volume grows, this becomes a performance bottleneck.
// @assumes: shares the same query cache as useNotifications(userId), so it doesn't trigger a separate fetch.
export function useUnreadCount(userId: string) {
  const { data } = useNotifications(userId);
  return data?.filter((n) => !n.read).length ?? 0;
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();

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
