// Shared type definitions — single source of truth for mobile + admin
// Only Supabase-backed types go here; app-specific types stay in their respective projects.

export type MovieStatus = 'announced' | 'upcoming' | 'in_theaters' | 'streaming' | 'released';
export type Certification = 'U' | 'UA' | 'A';
export type WatchlistStatus = 'watchlist' | 'watched';

export type VideoType =
  | 'teaser'
  | 'trailer'
  | 'glimpse'
  | 'song'
  | 'interview'
  | 'bts'
  | 'event'
  | 'promo'
  | 'making'
  | 'other';

export interface Movie {
  id: string;
  tmdb_id: number | null;
  title: string;
  poster_url: string | null;
  backdrop_url: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: string[] | null;
  certification: Certification | null;
  trailer_url: string | null;
  synopsis: string | null;
  director: string | null;
  in_theaters: boolean;
  premiere_date: string | null;
  original_language: string | null;
  backdrop_focus_x: number | null;
  backdrop_focus_y: number | null;
  poster_focus_x: number | null;
  poster_focus_y: number | null;
  poster_image_type: 'poster' | 'backdrop';
  backdrop_image_type: 'poster' | 'backdrop';
  spotlight_focus_x: number | null;
  spotlight_focus_y: number | null;
  detail_focus_x: number | null;
  detail_focus_y: number | null;
  rating: number;
  review_count: number;
  is_featured: boolean;
  imdb_id: string | null;
  title_te: string | null;
  synopsis_te: string | null;
  tagline: string | null;
  tmdb_status: string | null;
  tmdb_vote_average: number | null;
  tmdb_vote_count: number | null;
  budget: number | null;
  revenue: number | null;
  tmdb_popularity: number | null;
  spoken_languages: string[] | null;
  collection_id: number | null;
  collection_name: string | null;
  language_id: string | null;
  tmdb_last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovieTheatricalRun {
  id: string;
  movie_id: string;
  release_date: string;
  end_date: string | null;
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
  gender: number | null; // 0=not set, 1=female, 2=male, 3=non-binary (TMDB encoding)
  biography: string | null;
  place_of_birth: string | null;
  height_cm: number | null;
  imdb_id: string | null;
  known_for_department: string | null;
  also_known_as: string[] | null;
  death_date: string | null;
  instagram_id: string | null;
  twitter_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CastMember {
  id: string;
  movie_id: string;
  actor_id: string;
  role_name: string | null;
  display_order: number;
  credit_type: 'cast' | 'crew';
  role_order: number | null;
  actor?: Actor;
}

export interface ActorCredit {
  id: string;
  movie_id: string;
  actor_id: string;
  role_name: string | null;
  display_order: number;
  credit_type: 'cast' | 'crew';
  role_order: number | null;
  movie?: Movie;
}

export interface OTTPlatform {
  id: string;
  name: string;
  logo: string;
  logo_url: string | null;
  color: string;
  display_order: number;
  tmdb_provider_id?: number | null;
  regions?: string[];
}

export interface MoviePlatform {
  movie_id: string;
  platform_id: string;
  available_from: string | null;
  streaming_url: string | null;
  movie?: Movie;
  platform?: OTTPlatform;
}

export type AvailabilityType = 'flatrate' | 'rent' | 'buy' | 'ads' | 'free';

export interface Country {
  code: string;
  name: string;
  display_order: number;
}

export interface MoviePlatformAvailability {
  id: string;
  movie_id: string;
  platform_id: string;
  country_code: string;
  availability_type: AvailabilityType;
  available_from: string | null;
  streaming_url: string | null;
  tmdb_display_priority: number | null;
  created_at: string;
  platform?: OTTPlatform;
  country?: Country;
}

export interface WatchlistEntry {
  id: string;
  user_id: string;
  movie_id: string;
  status: WatchlistStatus;
  added_at: string;
  watched_at: string | null;
  movie?: Movie;
}

export interface MovieImage {
  id: string;
  movie_id: string;
  image_url: string;
  image_type: 'poster' | 'backdrop';
  is_main_poster: boolean;
  is_main_backdrop: boolean;
  title: string | null;
  description: string | null;
  poster_date: string | null;
  tmdb_file_path: string | null;
  iso_639_1: string | null;
  width: number | null;
  height: number | null;
  vote_average: number;
  display_order: number;
  created_at: string;
}

/** @deprecated Use MovieImage instead */
export type MoviePoster = MovieImage;

export interface MovieVideo {
  id: string;
  movie_id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  video_type: VideoType;
  video_date: string | null;
  display_order: number;
  created_at: string;
}

export interface ProductionHouse {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  tmdb_company_id: number | null;
  origin_country?: string | null;
  created_at: string;
}

// ── News Feed ───────────────────────────────────────────────────────────────────

export type FeedEntityType = 'movie' | 'actor' | 'production_house' | 'user';
export type FeedType = 'video' | 'poster' | 'surprise' | 'update';

export interface NewsFeedItem {
  id: string;
  feed_type: FeedType;
  content_type: string;
  title: string;
  description: string | null;
  movie_id: string | null;
  source_table: string | null;
  source_id: string | null;
  thumbnail_url: string | null;
  youtube_id: string | null;
  is_pinned: boolean;
  is_featured: boolean;
  display_order: number;
  upvote_count: number;
  downvote_count: number;
  view_count: number;
  comment_count: number;
  published_at: string;
  created_at: string;
  score?: number;
  movie?: { id: string; title: string; poster_url: string | null; release_date: string | null };
}

export interface FeedVote {
  id: string;
  feed_item_id: string;
  user_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface EntityFollow {
  id: string;
  user_id: string;
  entity_type: FeedEntityType;
  entity_id: string;
  created_at: string;
}

export interface EnrichedFollow {
  entity_type: FeedEntityType;
  entity_id: string;
  name: string;
  image_url: string | null;
  created_at: string;
}

export interface FeedComment {
  id: string;
  feed_item_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: { display_name: string | null };
}
