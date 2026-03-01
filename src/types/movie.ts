import { OTTPlatform, MoviePlatform } from './ott';

export type ReleaseType = 'theatrical' | 'ott' | 'upcoming' | 'ended';
export type Certification = 'U' | 'UA' | 'A';

export interface Movie {
  id: string;
  tmdb_id: number | null;
  title: string;
  poster_url: string | null;
  backdrop_url: string | null;
  release_date: string;
  runtime: number | null;
  genres: string[];
  certification: Certification | null;
  trailer_url: string | null;
  synopsis: string | null;
  director: string | null;
  release_type: ReleaseType;
  original_language: string | null;
  backdrop_focus_x: number | null;
  backdrop_focus_y: number | null;
  rating: number;
  review_count: number;
  is_featured: boolean;
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
  gender: number | null; // 0=not set, 1=female, 2=male, 3=non-binary (TMDB encoding)
  biography: string | null;
  place_of_birth: string | null;
  height_cm: number | null;
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

export interface MovieWithDetails extends Movie {
  cast: CastMember[];
  crew: CastMember[];
  platforms: MoviePlatform[];
}

export type { OTTPlatform, MoviePlatform };

export type WatchlistStatus = 'watchlist' | 'watched';

export interface WatchlistEntry {
  id: string;
  user_id: string;
  movie_id: string;
  status: WatchlistStatus;
  added_at: string;
  watched_at: string | null;
  movie?: Movie;
}
