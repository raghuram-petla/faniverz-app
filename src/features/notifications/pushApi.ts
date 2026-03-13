import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// @sideeffect: upsert with onConflict on (user_id, token) — if this UNIQUE constraint is ever removed, duplicate token rows accumulate and the user receives duplicate push notifications.
export async function upsertPushToken(userId: string, token: string): Promise<void> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform, is_active: true }, { onConflict: 'user_id,token' });

  if (error) throw error;
}

// @edge: no user_id filter — any caller with the token string can deactivate it. Security relies on the token being a long random string (Expo push token format).
export async function deactivatePushToken(token: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .update({ is_active: false })
    .eq('token', token);

  if (error) throw error;
}
