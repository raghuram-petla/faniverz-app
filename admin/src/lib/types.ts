// Re-export shared types — single source of truth in shared/types.ts
export type {
  ReleaseType,
  Certification,
  Movie,
  MovieTheatricalRun,
  Actor,
  CastMember,
  ActorCredit,
  OTTPlatform,
  MoviePlatform,
  WatchlistEntry,
} from '@shared/types';

// Admin-only types (not used by mobile)

export interface MovieCast {
  id: string;
  movie_id: string;
  actor_id: string;
  role_name: string | null;
  display_order: number;
  credit_type: 'cast' | 'crew';
  role_order: number | null;
  actor?: import('@shared/types').Actor;
  movie?: import('@shared/types').Movie;
}

export interface SurpriseContent {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  category: 'song' | 'short-film' | 'bts' | 'interview' | 'trailer';
  duration: string | null;
  views: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'release' | 'watchlist' | 'trending' | 'reminder';
  title: string;
  message: string;
  movie_id: string | null;
  platform_id: string | null;
  read: boolean;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  created_at: string;
  movie?: import('@shared/types').Movie;
}

export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  action: 'create' | 'update' | 'delete' | 'sync';
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface SyncLog {
  id: string;
  function_name: string;
  status: 'running' | 'success' | 'failed';
  movies_added: number;
  movies_updated: number;
  errors: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  is_admin: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalMovies: number;
  totalUsers: number;
  reviewsToday: number;
  activeNotifications: number;
}
