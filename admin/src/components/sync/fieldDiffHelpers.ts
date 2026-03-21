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
    case 'tagline':
      if (!movie.tagline && !tmdb.tagline) return 'same';
      if (!movie.tagline) return 'missing';
      return movie.tagline === tmdb.tagline ? 'same' : 'changed';
    case 'tmdb_status':
      if (!movie.tmdb_status && !tmdb.tmdbStatus) return 'same';
      if (!movie.tmdb_status) return 'missing';
      return movie.tmdb_status === tmdb.tmdbStatus ? 'same' : 'changed';
    case 'tmdb_ratings':
      if (movie.tmdb_vote_average == null && tmdb.tmdbVoteAverage == null) return 'same';
      if (movie.tmdb_vote_average == null) return 'missing';
      return movie.tmdb_vote_average === tmdb.tmdbVoteAverage ? 'same' : 'changed';
    case 'budget_revenue':
      if (movie.budget == null && movie.revenue == null && !tmdb.budget && !tmdb.revenue)
        return 'same';
      if (movie.budget == null && movie.revenue == null) return 'missing';
      return movie.budget === tmdb.budget && movie.revenue === tmdb.revenue ? 'same' : 'changed';
    case 'certification_auto':
      // @edge: always show as actionable if DB has no certification — server will extract from TMDB
      return !movie.certification ? 'missing' : 'same';
    case 'production_companies':
      if (!tmdb.productionCompanyCount) return 'same';
      return (movie.production_house_count ?? 0) >= tmdb.productionCompanyCount
        ? 'same'
        : 'missing';
    case 'spoken_languages': {
      const dbLangs = movie.spoken_languages ?? [];
      const tmdbLangs = tmdb.spokenLanguages ?? [];
      if (!dbLangs.length && !tmdbLangs.length) return 'same';
      if (!dbLangs.length) return 'missing';
      return [...dbLangs].sort().join(',') === [...tmdbLangs].sort().join(',') ? 'same' : 'changed';
    }
    case 'cast':
      return 'missing'; // always actionable — server guards against duplicate sync
    default:
      return 'missing';
  }
}

export interface FieldDef {
  key: FillableField;
  label: string;
  dbDisplay: string;
  tmdbDisplay: string;
}

/** Build the full list of field definitions for the diff table. */
export function buildFieldDefs(movie: ExistingMovieData, tmdb: LookupMovieData): FieldDef[] {
  return [
    { key: 'title', label: 'Title', dbDisplay: fmt(movie.title), tmdbDisplay: fmt(tmdb.title) },
    {
      key: 'synopsis',
      label: 'Synopsis',
      dbDisplay: movie.synopsis ?? '',
      tmdbDisplay: tmdb.overview ?? '',
    },
    {
      key: 'poster_url',
      label: 'Poster',
      dbDisplay: movie.poster_url ? '✓ set' : '',
      tmdbDisplay: tmdb.posterUrl ? '✓ available' : '',
    },
    {
      key: 'backdrop_url',
      label: 'Backdrop',
      dbDisplay: movie.backdrop_url ? '✓ set' : '',
      tmdbDisplay: tmdb.backdropUrl ? '✓ available' : '',
    },
    {
      key: 'trailer_url',
      label: 'Trailer',
      dbDisplay: extractYouTubeId(movie.trailer_url) ?? (movie.trailer_url ? '✓ set' : ''),
      tmdbDisplay: extractYouTubeId(tmdb.trailerUrl) ?? (tmdb.trailerUrl ? '✓ available' : ''),
    },
    {
      key: 'director',
      label: 'Director',
      dbDisplay: fmt(movie.director),
      tmdbDisplay: fmt(tmdb.director),
    },
    {
      key: 'runtime',
      label: 'Runtime',
      dbDisplay: movie.runtime ? `${movie.runtime} min` : '',
      tmdbDisplay: tmdb.runtime ? `${tmdb.runtime} min` : '',
    },
    {
      key: 'genres',
      label: 'Genres',
      dbDisplay: fmt(movie.genres),
      tmdbDisplay: tmdb.genres.join(', '),
    },
    {
      key: 'images',
      label: 'All Images',
      dbDisplay: `${movie.poster_count ?? 1} poster(s), ${movie.backdrop_count ?? 0} backdrop(s)`,
      tmdbDisplay: `${tmdb.posterCount} poster(s), ${tmdb.backdropCount} backdrop(s)`,
    },
    {
      key: 'videos',
      label: 'Videos',
      dbDisplay: `${movie.video_count ?? 0}`,
      tmdbDisplay: `${tmdb.videoCount}`,
    },
    {
      key: 'watch_providers',
      label: 'OTT Platforms',
      dbDisplay: movie.platform_names?.join(', ') || 'none',
      tmdbDisplay: tmdb.providerNames.length > 0 ? tmdb.providerNames.join(', ') : 'none',
    },
    {
      key: 'keywords',
      label: 'Keywords',
      dbDisplay: `${movie.keyword_count ?? 0}`,
      tmdbDisplay: `${tmdb.keywordCount}`,
    },
    {
      key: 'imdb_id',
      label: 'IMDb ID',
      dbDisplay: fmt(movie.imdb_id),
      tmdbDisplay: fmt(tmdb.imdbId),
    },
    {
      key: 'title_te',
      label: 'Telugu Title',
      dbDisplay: fmt(movie.title_te),
      tmdbDisplay: fmt(tmdb.titleTe),
    },
    {
      key: 'synopsis_te',
      label: 'Telugu Synopsis',
      dbDisplay: movie.synopsis_te ?? '',
      tmdbDisplay: tmdb.synopsisTe ?? '',
    },
    {
      key: 'tagline',
      label: 'Tagline',
      dbDisplay: fmt(movie.tagline),
      tmdbDisplay: fmt(tmdb.tagline),
    },
    {
      key: 'tmdb_status',
      label: 'TMDB Status',
      dbDisplay: fmt(movie.tmdb_status),
      tmdbDisplay: fmt(tmdb.tmdbStatus),
    },
    {
      key: 'tmdb_ratings',
      label: 'TMDB Rating',
      dbDisplay:
        movie.tmdb_vote_average != null
          ? `${movie.tmdb_vote_average}/10 (${movie.tmdb_vote_count ?? 0})`
          : '',
      tmdbDisplay:
        tmdb.tmdbVoteAverage != null
          ? `${tmdb.tmdbVoteAverage}/10 (${tmdb.tmdbVoteCount ?? 0})`
          : '',
    },
    {
      key: 'budget_revenue',
      label: 'Budget / Revenue',
      dbDisplay:
        movie.budget || movie.revenue
          ? `$${(movie.budget ?? 0).toLocaleString()} / $${(movie.revenue ?? 0).toLocaleString()}`
          : '',
      tmdbDisplay:
        tmdb.budget || tmdb.revenue
          ? `$${(tmdb.budget ?? 0).toLocaleString()} / $${(tmdb.revenue ?? 0).toLocaleString()}`
          : '',
    },
    {
      key: 'certification_auto',
      label: 'Certification (Auto)',
      dbDisplay: fmt(movie.certification),
      tmdbDisplay: 'From TMDB India release dates',
    },
    {
      key: 'production_companies',
      label: 'Production Cos.',
      dbDisplay: `${movie.production_house_count ?? 0}`,
      tmdbDisplay: `${tmdb.productionCompanyCount}`,
    },
    {
      key: 'spoken_languages',
      label: 'Languages',
      dbDisplay: fmt(movie.spoken_languages),
      tmdbDisplay: tmdb.spokenLanguages?.join(', ') || '',
    },
  ];
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
