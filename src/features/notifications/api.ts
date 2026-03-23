import { supabase } from '@/lib/supabase';
import { Notification } from '@/types';
import { unwrapList } from '@/utils/supabaseQuery';

// @boundary: nested select joins movie and platform data. If referenced movie/platform is deleted,
// the join returns null — callers must handle optional movie/platform.
// @contract: limited to 200 most recent notifications to prevent memory issues on high-activity users.
export async function fetchNotifications(userId: string): Promise<Notification[]> {
  return unwrapList(
    await supabase
      .from('notifications')
      .select('*, movie:movies(title, poster_url), platform:platforms(id, name, logo, color)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200),
  );
}

// @assumes: no RLS policy restricts which user can mark which notification as read. If RLS requires user_id match, and the caller passes a notification owned by a different user, this silently updates 0 rows (no error). The UI still shows it as read due to optimistic update, but the next fetch reverts it.
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
