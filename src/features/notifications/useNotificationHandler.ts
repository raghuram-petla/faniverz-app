import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

// @sideeffect: setNotificationHandler is called at module load time (top-level), not inside a component or hook.
// This means importing this file — even in tests — registers a global notification handler. If multiple files
// import this module, the handler is set once (last-write-wins if called multiple times, but here it's idempotent).
// @assumes: shouldShowBanner and shouldShowList are required by expo-notifications' NotificationBehavior type
// (Expo SDK 54+). Omitting them causes a TypeScript error but would still work at runtime with defaults.
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
        // @boundary: data comes from the push notification payload set by the server.
        // @contract: validates payload fields are non-empty strings before deep-linking.
        // Supports movie_id, actor_id, and production_house_id — falls back to /notifications.
        const data = response.notification.request.content.data;

        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        if (data?.feed_item_id && typeof data.feed_item_id === 'string') {
          // @contract: comment reply/like notifications deep-link to the post detail
          router.push(`/post/${data.feed_item_id}`);
        } else if (data?.movie_id && typeof data.movie_id === 'string') {
          router.push(`/movie/${data.movie_id}`);
        } else if (data?.actor_id && typeof data.actor_id === 'string') {
          router.push(`/actor/${data.actor_id}`);
        } else if (data?.production_house_id && typeof data.production_house_id === 'string') {
          router.push(`/production-house/${data.production_house_id}`);
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
