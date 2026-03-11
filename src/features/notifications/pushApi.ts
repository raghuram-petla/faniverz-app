import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export async function upsertPushToken(userId: string, token: string): Promise<void> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform, is_active: true }, { onConflict: 'user_id,token' });

  if (error) throw error;
}

export async function deactivatePushToken(token: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .update({ is_active: false })
    .eq('token', token);

  if (error) throw error;
}
