// Re-export shared types — single source of truth in shared/types.ts
export type {
  MovieStatus,
  Certification,
  Movie,
  MovieTheatricalRun,
  Actor,
  CastMember,
  ActorCredit,
  OTTPlatform,
  MoviePlatform,
  WatchlistEntry,
  VideoType,
  MoviePoster,
  MovieVideo,
  ProductionHouse,
  FeedType,
  NewsFeedItem,
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
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  admin_email: string | null;
  admin_display_name: string | null;
  impersonating_user_id: string | null;
  impersonating_role: string | null;
  impersonating_email: string | null;
  impersonating_display_name: string | null;
}

export const AUDIT_ENTITY_TYPES = [
  'actor',
  'movie',
  'movie_cast',
  'movie_poster',
  'movie_production_house',
  'movie_video',
  'news_feed',
  'notification',
  'ott_release',
  'platform',
  'production_house',
  'surprise',
  'sync',
  'theatrical_run',
] as const;

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

interface UserProfile {
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

// ============================================================
// RBAC Types
// ============================================================

export type AdminRoleId = 'super_admin' | 'admin' | 'production_house_admin';

export interface AdminPHAssignment {
  user_id: string;
  production_house_id: string;
  assigned_by: string | null;
  created_at: string;
  production_house?: import('@shared/types').ProductionHouse;
}

export interface AdminInvitation {
  id: string;
  email: string;
  role_id: AdminRoleId;
  invited_by: string;
  production_house_ids: string[];
  status: 'pending' | 'accepted' | 'revoked';
  token: string;
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
  inviter?: UserProfile;
}

/** Extended user profile with role info — used by AuthProvider */
export interface AdminUser extends UserProfile {
  role: AdminRoleId;
  productionHouseIds: string[];
}

export const ADMIN_ROLE_LABELS: Record<AdminRoleId, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  production_house_admin: 'PH Admin',
};

/** Admin user with role + PH assignment details — used by user management */
export interface AdminUserWithDetails {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role_id: AdminRoleId;
  role_assigned_at: string;
  assigned_by: string | null;
  ph_assignments: AdminPHAssignment[];
}
