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

export function useUnreadCount(userId: string) {
  const { data } = useNotifications(userId);
  return data?.filter((n) => !n.read).length ?? 0;
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();

  const markRead = useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      console.warn('Failed to mark notification as read');
    },
  });

  const markAllRead = useMutation({
    mutationFn: (userId: string) => markAllAsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      console.warn('Failed to mark all notifications as read');
    },
  });

  return { markRead, markAllRead };
}
