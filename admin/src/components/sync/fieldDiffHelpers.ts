/**
 * Pure helper functions for FieldDiffPanel — field status comparison and formatting.
 *
 * @contract: all functions are pure — no side effects, no API calls.
 * @coupling: depends on ExistingMovieData and LookupMovieData from useSync.
 */

import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';
import type { FillableField } from '@/lib/syncUtils';

export type FieldStatus = 'missing' | 'changed' | 'same';

/** @edge extract YouTube video ID from various URL formats (watch?v=, youtu.be/, embed/) */
export function extractYouTubeId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

/** @edge genres: sorted join for stable comparison regardless of TMDB order */
function genreStatus(db: string[] | null, tmdb: string[]): FieldStatus {
  // @edge both sides empty → nothing to fill, show as "same"
  if (!db?.length && !tmdb.length) return 'same';
  if (!db?.length) return 'missing';
  return [...db].sort().join(',') === [...tmdb].sort().join(',') ? 'same' : 'changed';
}

export function getStatus(
  movie: ExistingMovieData,
  tmdb: LookupMovieData,
  field: FillableField,
): FieldStatus {
  switch (field) {
    case 'title':
      if (!movie.title && !tmdb.title) return 'same';
      if (!movie.title) return 'missing';
      return movie.title === tmdb.title ? 'same' : 'changed';
    case 'synopsis':
      if (!movie.synopsis && !tmdb.overview) return 'same';
      if (!movie.synopsis) return 'missing';
      return movie.synopsis === tmdb.overview ? 'same' : 'changed';
    case 'poster_url':
      // @edge if both sides null → same; if DB set → same (can't compare URLs)
      if (!movie.poster_url && !tmdb.posterUrl) return 'same';
      return !movie.poster_url ? 'missing' : 'same';
    case 'backdrop_url':
      if (!movie.backdrop_url && !tmdb.backdropUrl) return 'same';
      return !movie.backdrop_url ? 'missing' : 'same';
    case 'trailer_url': {
      if (!movie.trailer_url) return tmdb.trailerUrl ? 'missing' : 'same';
      // @edge compare YouTube video IDs — URLs may differ in format
      const dbVideoId = extractYouTubeId(movie.trailer_url);
      const tmdbVideoId = extractYouTubeId(tmdb.trailerUrl);
      return dbVideoId && tmdbVideoId && dbVideoId === tmdbVideoId ? 'same' : 'changed';
    }
    case 'director':
      if (!movie.director && !tmdb.director) return 'same';
      if (!movie.director) return 'missing';
      return movie.director === tmdb.director ? 'same' : 'changed';
    case 'runtime': {
      // @edge TMDB returns 0 for unknown runtime — treat as null
      const dbRuntime = movie.runtime ?? null;
      const tmdbRuntime = tmdb.runtime || null;
      if (dbRuntime == null && tmdbRuntime == null) return 'same';
      if (dbRuntime == null) return 'missing';
      return dbRuntime === tmdbRuntime ? 'same' : 'changed';
    }
    case 'genres':
      return genreStatus(movie.genres, tmdb.genres);
    case 'images':
      // @edge show as actionable if TMDB has more posters/backdrops than we have
      return tmdb.posterCount > 1 || tmdb.backdropCount > 0 ? 'missing' : 'same';
    case 'videos':
      return tmdb.videoCount > 0 ? 'missing' : 'same';
    case 'watch_providers':
      return tmdb.providerNames.length > 0 ? 'missing' : 'same';
    case 'keywords':
      return tmdb.keywordCount > 0 ? 'missing' : 'same';
    case 'imdb_id':
      if (!movie.imdb_id && !tmdb.imdbId) return 'same';
      if (!movie.imdb_id) return 'missing';
      return movie.imdb_id === tmdb.imdbId ? 'same' : 'changed';
    case 'title_te':
      if (!movie.title_te && !tmdb.titleTe) return 'same';
      if (!movie.title_te) return 'missing';
      return movie.title_te === tmdb.titleTe ? 'same' : 'changed';
    case 'synopsis_te':
      if (!movie.synopsis_te && !tmdb.synopsisTe) return 'same';
      if (!movie.synopsis_te) return 'missing';
      return movie.synopsis_te === tmdb.synopsisTe ? 'same' : 'changed';
    case 'cast':
      return 'missing'; // always actionable — server guards against duplicate sync
    default:
      return 'missing';
  }
}

export function fmt(val: string | string[] | number | null | undefined): string {
  if (val == null) return '';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'number') return String(val);
  return val;
}

export function truncate(s: string | null | undefined, n = 80): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}
