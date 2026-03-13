import { supabase } from '@/lib/supabase';
import { Notification } from '@/types';

// @boundary: nested select joins movie and platform data. If referenced movie/platform is deleted,
// the join returns null — callers must handle optional movie/platform.
// @contract: limited to 200 most recent notifications to prevent memory issues on high-activity users.
export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, movie:movies(title, poster_url), platform:platforms(id, name, logo, color)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return data ?? [];
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

// @edge: filters by .eq('read', false) to only update unread rows. If no unread notifications exist,
// Supabase returns success with 0 affected rows (not an error). The mutation's onSuccess still fires
// and triggers a full notifications refetch, even though nothing changed.
export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
}
