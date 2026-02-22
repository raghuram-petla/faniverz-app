export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  adult: boolean;
}

export interface TmdbMovieDetail extends TmdbMovie {
  genres: TmdbGenre[];
  credits: TmdbCredits;
  videos: TmdbVideos;
  'watch/providers'?: TmdbWatchProviders;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TmdbVideos {
  results: TmdbVideo[];
}

export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TmdbWatchProviders {
  results: Record<string, TmdbCountryProviders>;
}

export interface TmdbCountryProviders {
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TmdbDiscoverResponse {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
}

// TMDB genre ID to name mapping for Telugu movies
export const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

// Crew roles to sync
export const CREW_ROLES_TO_SYNC = [
  'Director',
  'Producer',
  'Music',
  'Original Music Composer',
  'Director of Photography',
  'Screenplay',
  'Writer',
  'Story',
];

export const CREW_ROLE_MAP: Record<string, string> = {
  Director: 'director',
  Producer: 'producer',
  Music: 'music_director',
  'Original Music Composer': 'music_director',
  'Director of Photography': 'cinematographer',
  Screenplay: 'writer',
  Writer: 'writer',
  Story: 'writer',
};
