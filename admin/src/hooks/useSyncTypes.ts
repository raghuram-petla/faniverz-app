import type { TmdbDiscoverMovie, TmdbSearchPerson } from '@/lib/tmdb';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Full DB snapshot of a movie that already exists — used for field-level diff.
 * @contract: scalar fields only. Aggregate counts (images, videos, keywords, etc.)
 * are fetched per-movie by the lookup route for self-contained gap analysis. */
export interface ExistingMovieData {
  id: string;
  tmdb_id: number;
  title: string | null;
  synopsis: string | null;
  release_date: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  director: string | null;
  runtime: number | null;
  genres: string[] | null;
  // @contract: extended fields for diff panel
  imdb_id: string | null;
  title_te: string | null;
  synopsis_te: string | null;
  tagline: string | null;
  tmdb_status: string | null;
  tmdb_vote_average: number | null;
  tmdb_vote_count: number | null;
  budget: number | null;
  revenue: number | null;
  certification: string | null;
  spoken_languages: string[] | null;
}

/** @contract Potential duplicate — a local movie with matching title but no tmdb_id */
export interface DuplicateSuspect {
  id: string;
  title: string;
}

export interface DiscoverResult {
  results: TmdbDiscoverMovie[];
  /** Full DB snapshots for movies already in our DB — derive existingTmdbIds via .map(m => m.tmdb_id) */
  existingMovies: ExistingMovieData[];
  /** @nullable TMDB ID → local movie with matching title but no tmdb_id */
  duplicateSuspects?: Record<number, DuplicateSuspect>;
}

export interface FillFieldsResponse {
  movieId: string;
  /** Field keys that were actually updated (e.g. 'cast' omitted if already had entries). */
  updatedFields: string[];
}

export interface LookupMovieData {
  tmdbId: number;
  title: string;
  overview: string;
  releaseDate: string;
  runtime: number | null;
  genres: string[];
  posterUrl: string | null;
  backdropUrl: string | null;
  director: string | null;
  castCount: number;
  crewCount: number;
  // @contract: extended counts from TMDB
  posterCount: number;
  backdropCount: number;
  videoCount: number;
  providerNames: string[];
  keywordCount: number;
  imdbId: string | null;
  titleTe: string | null;
  synopsisTe: string | null;
  // @contract: new TMDB metadata for diff panel
  tagline: string | null;
  tmdbStatus: string | null;
  tmdbVoteAverage: number | null;
  tmdbVoteCount: number | null;
  budget: number | null;
  revenue: number | null;
  certification: string | null;
  spokenLanguages: string[];
  productionCompanyCount: number;
  originalLanguage: string;
  // @contract: DB-side counts — fetched per-movie by the lookup route for self-contained gap analysis.
  // These live alongside TMDB counts so getStatus() has both sides in one object.
  dbPosterCount: number;
  dbBackdropCount: number;
  dbVideoCount: number;
  dbKeywordCount: number;
  dbProductionHouseCount: number;
  dbPlatformNames: string[];
}

export interface LookupPersonData {
  tmdbPersonId: number;
  name: string;
  biography: string | null;
  birthday: string | null;
  placeOfBirth: string | null;
  photoUrl: string | null;
  gender: number;
}

export type LookupResult =
  | { type: 'movie'; existsInDb: boolean; existingId: string | null; data: LookupMovieData }
  | { type: 'person'; existsInDb: boolean; existingId: string | null; data: LookupPersonData };

export interface ImportMovieResult {
  movieId: string;
  title: string;
  tmdbId: number;
  isNew: boolean;
  castCount: number;
  crewCount: number;
  posterCount: number;
  backdropCount: number;
}

export interface ImportMoviesResponse {
  syncLogId: string;
  results: ImportMovieResult[];
  errors: Array<{ tmdbId: number; message: string }>;
}

export interface RefreshMovieResponse {
  syncLogId: string;
  result: ImportMovieResult;
}

export interface RefreshActorResponse {
  syncLogId: string;
  result: {
    actorId: string;
    name: string;
    updated: boolean;
    fields: string[];
  };
}

export interface StaleItem {
  id: string;
  title?: string;
  name?: string;
  tmdb_id?: number;
  tmdb_person_id?: number;
  tmdb_last_synced_at?: string | null;
}

export interface StaleItemsResponse {
  type: string;
  items: StaleItem[];
  days?: number;
}

/** @contract Response from /api/sync/search — combined movies + actors */
export interface TmdbSearchAllResult {
  movies: {
    results: TmdbDiscoverMovie[];
    existingTmdbIds: number[];
    /** @contract Map tmdb_id → local movie id for "Edit" links on existing movies */
    existingMovieIds?: Record<number, string>;
    duplicateSuspects?: Record<number, DuplicateSuspect>;
  };
  actors: { results: TmdbSearchPerson[]; existingTmdbPersonIds: number[] };
}
