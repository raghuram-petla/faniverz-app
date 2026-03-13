import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { upsertPushToken, deactivatePushToken } from './pushApi';
import { STORAGE_KEYS } from '@/constants/storage';

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  // Create Android notification channel before requesting permissions
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // @nullable: projectId can be undefined if app.config doesn't have extra.eas.projectId set (e.g., local dev
  // without EAS). getExpoPushTokenAsync will still attempt to fetch a token but may fail with an opaque error
  // about missing project configuration, not a clear "projectId is undefined" message.
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return token;
}

export function usePushToken() {
  const { user } = useAuth();
  // @invariant: registeredRef prevents duplicate registration within a single component mount. But if the user
  // signs out and signs in as a different user without the component unmounting (session swap via AuthProvider),
  // the ref stays true and the new user's push token is never registered. The ref resets only on remount.
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user || registeredRef.current) return;

    (async () => {
      try {
        const pushPref = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_NOTIFICATIONS);
        // @edge: opted-out path still calls registerForPushNotifications() which requests OS permissions.
        // A user who disabled push in app settings will still see the OS permission prompt on first launch
        // if they haven't granted it yet — confusing since they already opted out. The token is obtained
        // only to pass it to deactivatePushToken, but requesting permissions is a side effect of getting the token.
        if (pushPref === 'false') {
          // User has opted out — deactivate any existing token
          const token = await registerForPushNotifications();
          if (token && user.id) {
            await deactivatePushToken(token);
          }
          registeredRef.current = true;
          return;
        }

        const token = await registerForPushNotifications();
        if (token && user.id) {
          await upsertPushToken(user.id, token);
          registeredRef.current = true;
        }
      } catch {
        // Silently fail — push is optional
      }
    })();
  }, [user]);
}
