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
  MovieImage,
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
  reverted_at: string | null;
  reverted_by: string | null;
  reverted_by_display_name: string | null;
  reverted_by_email: string | null;
  entity_display_name: string | null;
}

// @coupling: AUDIT_ENTITY_TYPES must match TG_TABLE_NAME values written by audit_trigger_fn()
// @invariant: these are actual PostgreSQL table names (plural), not singular aliases
export const AUDIT_ENTITY_TYPES = [
  'actors',
  'admin_invitations',
  'admin_ph_assignments',
  'admin_roles',
  'admin_user_roles',
  'countries',
  'languages',
  'movie_backdrops',
  'movie_cast',
  'movie_images',
  'movie_keywords',
  'movie_platform_availability',
  'movie_platforms',
  'movie_posters',
  'movie_production_houses',
  'movie_theatrical_runs',
  'movie_videos',
  'movies',
  'news_feed',
  'notifications',
  'platforms',
  'production_houses',
  'surprise_content',
  'user_languages',
] as const;

export interface SyncLog {
  id: string;
  function_name: string;
  status: 'running' | 'success' | 'failed';
  movies_added: number;
  movies_updated: number;
  errors: Record<string, unknown> | null;
  /** @contract: list of item names processed (movie titles, actor names) */
  details: string[] | null;
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
  totalActors: number;
  totalUsers: number;
  totalReviews: number;
  totalFeedItems: number;
  totalComments: number;
}

export interface Review {
  id: string;
  movie_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  contains_spoiler: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  movie?: { id: string; title: string; poster_url: string | null };
  profile?: { id: string; display_name: string | null; email: string | null };
}

export interface FeedComment {
  id: string;
  feed_item_id: string;
  user_id: string;
  body: string;
  created_at: string;
  feed_item?: { id: string; title: string | null };
  profile?: { id: string; display_name: string | null; email: string | null };
}

// ============================================================
// RBAC Types
//
// @invariant: Role hierarchy (highest → lowest):
//   root > super_admin > admin > production_house_admin > viewer
//
// @contract: Each role can only manage/impersonate roles BELOW it:
//   root         → can manage super_admin, admin, PH admin, viewer
//   super_admin  → can manage admin, PH admin, viewer
//   admin        → can manage PH admin, viewer
//   PH admin     → can manage viewer only
//   viewer       → cannot manage anyone (read-only)
//
// @boundary: root is SQL-only — cannot be assigned via the admin UI.
// ============================================================

export type AdminRoleId = 'root' | 'super_admin' | 'admin' | 'production_house_admin' | 'viewer';

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
  language_ids: string[];
  status: 'pending' | 'accepted' | 'revoked';
  token: string;
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
  inviter?: UserProfile;
}

/** Content language record from the languages table */
export interface Language {
  id: string;
  code: string;
  name: string;
}

/** Extended user profile with role info — used by AuthProvider */
export interface AdminUser extends UserProfile {
  role: AdminRoleId;
  productionHouseIds: string[];
  /** @contract Empty for root/super_admin (implicit all-language access).
   * Contains assigned language UUIDs for admin role. Empty for PH admin/viewer.
   * Used by LanguageAssignments component for managing assignments. */
  languageIds: string[];
  /** @contract Language codes (e.g. 'te', 'ta') resolved from languageIds.
   * Used for RBAC checks and language switcher filtering against original_language. */
  languageCodes: string[];
}

export const ADMIN_ROLE_LABELS: Record<AdminRoleId, string> = {
  root: 'Root',
  super_admin: 'Super Admin',
  admin: 'Admin',
  production_house_admin: 'PH Admin',
  viewer: 'Viewer',
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
  status: 'active' | 'blocked';
  blocked_by: string | null;
  blocked_at: string | null;
  blocked_reason: string | null;
}
