import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { upsertPushToken } from './pushApi';

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

    registerForPushNotifications()
      .then((token) => {
        if (token && user.id) {
          return upsertPushToken(user.id, token).then(() => {
            registeredRef.current = true;
          });
        }
      })
      .catch(() => {
        // Silently fail — push is optional
      });
  }, [user]);
}
