export type ReleaseType = 'theatrical' | 'ott_original';

export type MovieStatus = 'upcoming' | 'released' | 'postponed' | 'cancelled';

export type ContentType = 'movie' | 'series';

export type DotType = 'theatrical' | 'ott_premiere' | 'ott_original';

export interface Movie {
  id: number;
  tmdb_id: number | null;
  title: string;
  title_te: string | null;
  original_title: string | null;
  overview: string | null;
  overview_te: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: string[];
  certification: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  content_type: ContentType;
  release_type: ReleaseType;
  status: MovieStatus;
  trailer_youtube_key: string | null;
  is_featured: boolean;
  tmdb_last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CastRole =
  | 'actor'
  | 'director'
  | 'producer'
  | 'music_director'
  | 'cinematographer'
  | 'writer';

export interface MovieCast {
  id: number;
  movie_id: number;
  tmdb_person_id: number | null;
  name: string;
  name_te: string | null;
  character: string | null;
  role: CastRole;
  profile_path: string | null;
  display_order: number;
}

export interface CalendarEntry {
  date: string;
  movie: Movie;
  dotType: DotType;
  platform_id?: number;
  platform_name?: string;
}
