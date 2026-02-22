import { supabase } from '@/lib/supabase';
import type { PushToken } from '@/types/notification';

export async function registerPushToken(
  userId: string,
  expoPushToken: string,
  devicePlatform: string
): Promise<PushToken> {
  const { data, error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        device_platform: devicePlatform,
        is_active: true,
      },
      { onConflict: 'user_id,expo_push_token' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as PushToken;
}

export async function deactivatePushToken(userId: string, expoPushToken: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('expo_push_token', expoPushToken);

  if (error) throw error;
}

export interface NotificationPreferences {
  notify_watchlist: boolean;
  notify_ott: boolean;
  notify_digest: boolean;
}

export async function fetchNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notify_watchlist, notify_ott, notify_digest')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  const { error } = await supabase.from('profiles').update(prefs).eq('id', userId);

  if (error) throw error;
}
