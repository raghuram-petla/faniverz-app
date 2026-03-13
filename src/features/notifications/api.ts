import { supabase } from '@/lib/supabase';
import { Notification } from '@/types';

// @boundary: nested select joins movie and platform data in a single query. If a notification references a
// movie_id or platform_id that was deleted (no FK CASCADE), the join returns null for that relation rather
// than failing — callers must handle notification.movie or notification.platform being null even if the
// Notification type doesn't mark them as optional.
// @edge: no LIMIT on this query — fetches ALL notifications for the user. For power users with years of
// notifications, this unbounded fetch can return thousands of rows, causing slow load times and high memory use.
export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, movie:movies(title, poster_url), platform:platforms(id, name, logo, color)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

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
