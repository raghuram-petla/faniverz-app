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

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return token;
}

export function usePushToken() {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user || registeredRef.current) return;

    (async () => {
      try {
        const pushPref = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_NOTIFICATIONS);
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
