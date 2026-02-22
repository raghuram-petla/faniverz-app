export type NotificationType =
  | 'watchlist_reminder'
  | 'release_day'
  | 'ott_available'
  | 'weekly_digest';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface NotificationQueueItem {
  id: number;
  user_id: string;
  movie_id: number | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  scheduled_for: string;
  status: NotificationStatus;
  sent_at: string | null;
  created_at: string;
}

export interface PushToken {
  id: number;
  user_id: string;
  expo_push_token: string;
  device_platform: string;
  is_active: boolean;
}
