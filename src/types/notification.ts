import { Movie } from './movie';

export type NotificationType = 'release' | 'watchlist' | 'trending' | 'reminder';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  movie_id: string | null;
  platform_id: string | null;
  read: boolean;
  scheduled_for: string;
  status: NotificationStatus;
  created_at: string;
  movie?: Pick<Movie, 'id' | 'title' | 'poster_url'>;
}
