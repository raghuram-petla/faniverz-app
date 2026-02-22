import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { registerPushToken } from './api';
import { parseNotificationDeepLink } from './deep-link';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications(userId: string | undefined) {
  const registered = useRef(false);

  useEffect(() => {
    if (!userId || registered.current) return;

    async function register() {
      if (!Device.isDevice) return;

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      const platform = Platform.OS;

      await registerPushToken(userId!, token, platform);
      registered.current = true;
    }

    register();
  }, [userId]);
}

export function useNotificationHandler() {
  const router = useRouter();
  const lastResponse = useRef<string | null>(null);

  useEffect(() => {
    // Warm start: notification tapped while app is running
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const deepLink = parseNotificationDeepLink(data);
      if (deepLink && deepLink !== lastResponse.current) {
        lastResponse.current = deepLink;
        router.push(deepLink as never);
      }
    });

    // Cold start: check last notification response
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        const deepLink = parseNotificationDeepLink(data);
        if (deepLink && deepLink !== lastResponse.current) {
          lastResponse.current = deepLink;
          router.push(deepLink as never);
        }
      }
    });

    return () => subscription.remove();
  }, [router]);
}
