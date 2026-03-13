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
        // @boundary: data comes from the push notification payload set by the server. Its shape is unvalidated —
        // if the server sends a malformed payload (e.g., movie_id as a number instead of string, or a typo
        // like 'movieId'), the router.push silently navigates to '/movie/undefined' which shows a "not found" screen.
        const data = response.notification.request.content.data;

        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        // @contract: only movie_id is handled for deep linking. Notifications about actors, production houses,
        // or other entities all fall through to the generic '/notifications' screen. Adding new deep link
        // types requires updating this conditional — there's no registry or mapping pattern.
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
