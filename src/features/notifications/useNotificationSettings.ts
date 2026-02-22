import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotificationPreferences, updateNotificationPreferences } from './api';
import type { NotificationPreferences } from './api';

const NOTIFICATION_PREFS_KEY = 'notification-prefs';

export function useNotificationSettings(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [NOTIFICATION_PREFS_KEY, userId],
    queryFn: () => fetchNotificationPreferences(userId!),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPreferences>) =>
      updateNotificationPreferences(userId!, prefs),
    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATION_PREFS_KEY, userId] });
      const previous = queryClient.getQueryData<NotificationPreferences>([
        NOTIFICATION_PREFS_KEY,
        userId,
      ]);
      if (previous) {
        queryClient.setQueryData([NOTIFICATION_PREFS_KEY, userId], {
          ...previous,
          ...newPrefs,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([NOTIFICATION_PREFS_KEY, userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_PREFS_KEY, userId] });
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    updatePreference: mutation.mutate,
    isPending: mutation.isPending,
  };
}
