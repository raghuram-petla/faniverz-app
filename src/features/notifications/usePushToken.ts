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

// @contract: returns token without requesting OS permissions — uses getPermissionsAsync (read-only)
// instead of requestPermissionsAsync. Returns null if permissions were never granted.
async function getExistingPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

export function usePushToken() {
  const { user } = useAuth();
  const registeredRef = useRef(false);
  // @sideeffect: tracks the user ID that was last registered. When user changes (session swap),
  // resets registeredRef so the new user's token gets registered.
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Reset registration ref on user change (handles session swap without remount)
    if (lastUserIdRef.current !== null && lastUserIdRef.current !== user.id) {
      registeredRef.current = false;
    }
    lastUserIdRef.current = user.id;

    if (registeredRef.current) return;

    // @sync: cancelled guard prevents stale IIFE from writing token for the wrong user if user
    // changes while async work is in progress (e.g., rapid sign-out + sign-in as different account).
    let cancelled = false;

    (async () => {
      try {
        const pushPref = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_NOTIFICATIONS);
        if (cancelled) return;
        if (pushPref === 'false') {
          // @edge: user opted out — deactivate without requesting OS permissions.
          // Uses getExistingPushToken which only reads current permission status.
          const token = await getExistingPushToken();
          if (cancelled) return;
          if (token && user.id) {
            await deactivatePushToken(token);
          }
          if (!cancelled) registeredRef.current = true;
          return;
        }

        const token = await registerForPushNotifications();
        if (cancelled) return;
        if (token && user.id) {
          await upsertPushToken(user.id, token);
          if (!cancelled) registeredRef.current = true;
        }
      } catch (err) {
        // @edge: push is optional — log for debugging but don't block the app
        console.warn('Push token registration failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);
}
