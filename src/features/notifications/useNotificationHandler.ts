import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotificationHandler() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const responseListenerRef = useRef<EventSubscription | null>(null);

  useEffect(() => {
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        if (data?.movie_id) {
          router.push(`/movie/${data.movie_id}`);
        } else {
          router.push('/notifications');
        }
      },
    );

    return () => {
      responseListenerRef.current?.remove();
    };
  }, [router, queryClient]);
}
