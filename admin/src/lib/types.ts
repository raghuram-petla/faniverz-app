// Movie types matching the Supabase schema
export interface Movie {
  id: string;
  tmdb_id: number | null;
  title: string;
  poster_url: string | null;
  backdrop_url: string | null;
  release_date: string;
  runtime: number | null;
  genres: string[];
  certification: 'U' | 'UA' | 'A' | null;
  trailer_url: string | null;
  synopsis: string | null;
  director: string | null;
  release_type: 'theatrical' | 'ott' | 'upcoming' | 'ended';
  original_language: string | null;
  rating: number;
  review_count: number;
  tmdb_last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovieTheatricalRun {
  id: string;
  movie_id: string;
  release_date: string;
  label: string | null;
  created_at: string;
}

export interface Actor {
  id: string;
  tmdb_person_id: number | null;
  name: string;
  photo_url: string | null;
  birth_date: string | null;
  person_type: 'actor' | 'technician';
  tier_rank: number | null;
  created_at: string;
}

export interface MovieCast {
  id: string;
  movie_id: string;
  actor_id: string;
  role_name: string | null;
  display_order: number;
  credit_type: 'cast' | 'crew';
  role_order: number | null;
  actor?: Actor;
  movie?: Movie;
}

export interface OTTPlatform {
  id: string;
  name: string;
  logo: string;
  color: string;
  display_order: number;
}

export interface MoviePlatform {
  movie_id: string;
  platform_id: string;
  available_from: string | null;
  movie?: Movie;
  platform?: OTTPlatform;
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
  movie?: Movie;
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
