import { Movie } from './movie';

export type NotificationType = 'release' | 'watchlist' | 'trending' | 'reminder' | 'comment_reply' | 'comment_like';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  movie_id: string | null;
  platform_id: string | null;
  comment_id: string | null;
  feed_item_id: string | null;
  actor_user_id: string | null;
  read: boolean;
  scheduled_for: string;
  status: NotificationStatus;
  created_at: string;
  movie?: Pick<Movie, 'id' | 'title' | 'poster_url' | 'poster_image_type'>;
  platform?: { id: string; name: string; logo: string; color: string } | null;
  actor_profile?: { display_name: string | null; avatar_url: string | null } | null;
}
