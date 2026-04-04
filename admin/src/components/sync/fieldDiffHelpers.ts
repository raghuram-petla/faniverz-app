/** Pure helpers for FieldDiffPanel — field status comparison and formatting. */

import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';
import type { FillableField } from '@/lib/syncUtils';
import { fmt } from './fieldDiffFormatters';

export { fmt, truncate } from './fieldDiffFormatters';

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
    case 'release_date':
      if (!movie.release_date && !tmdb.releaseDate) return 'same';
      if (!movie.release_date) return 'missing';
      return movie.release_date === tmdb.releaseDate ? 'same' : 'changed';
    case 'images':
      // @contract compare DB counts (from lookup) against TMDB counts
      if (tmdb.posterCount === 0 && tmdb.backdropCount === 0) return 'same';
      return tmdb.dbPosterCount >= tmdb.posterCount && tmdb.dbBackdropCount >= tmdb.backdropCount
        ? 'same'
        : 'missing';
    case 'videos':
      if (tmdb.videoCount === 0) return 'same';
      return tmdb.dbVideoCount >= tmdb.videoCount ? 'same' : 'missing';
    case 'watch_providers':
      if (tmdb.providerNames.length === 0) return 'same';
      return tmdb.dbPlatformNames.length >= tmdb.providerNames.length ? 'same' : 'missing';
    case 'keywords':
      if (tmdb.keywordCount === 0) return 'same';
      return tmdb.dbKeywordCount >= tmdb.keywordCount ? 'same' : 'missing';
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
      // @contract: only show gap if TMDB actually has India cert data and DB doesn't
      if (!tmdb.certification) return 'same';
      if (!movie.certification) return 'missing';
      return movie.certification === tmdb.certification ? 'same' : 'changed';
    case 'production_companies':
      if (!tmdb.productionCompanyCount) return 'same';
      return tmdb.dbProductionHouseCount >= tmdb.productionCompanyCount ? 'same' : 'missing';
    case 'spoken_languages': {
      const dbLangs = movie.spoken_languages ?? [];
      /* v8 ignore start */
      const tmdbLangs = tmdb.spokenLanguages ?? [];
      /* v8 ignore stop */

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

interface FieldDef {
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
      key: 'release_date',
      label: 'Release Date',
      dbDisplay: fmt(movie.release_date),
      tmdbDisplay: fmt(tmdb.releaseDate),
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
      dbDisplay: `${tmdb.dbPosterCount} poster(s), ${tmdb.dbBackdropCount} backdrop(s)`,
      tmdbDisplay: `${tmdb.posterCount} poster(s), ${tmdb.backdropCount} backdrop(s)`,
    },
    {
      key: 'videos',
      label: 'Videos',
      dbDisplay: `${tmdb.dbVideoCount}`,
      tmdbDisplay: `${tmdb.videoCount}`,
    },
    {
      key: 'watch_providers',
      label: 'OTT Platforms',
      dbDisplay: tmdb.dbPlatformNames.length > 0 ? tmdb.dbPlatformNames.join(', ') : 'none',
      tmdbDisplay: tmdb.providerNames.length > 0 ? tmdb.providerNames.join(', ') : 'none',
    },
    {
      key: 'keywords',
      label: 'Keywords',
      dbDisplay: `${tmdb.dbKeywordCount}`,
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
          ? /* v8 ignore start */
            /* v8 ignore stop */
            /* v8 ignore start */
            `$${(movie.budget ?? 0).toLocaleString()} / $${(movie.revenue ?? 0).toLocaleString()}`
          : /* v8 ignore stop */
            '',
      tmdbDisplay:
        tmdb.budget || tmdb.revenue
          ? /* v8 ignore start */
            /* v8 ignore stop */
            /* v8 ignore start */
            `$${(tmdb.budget ?? 0).toLocaleString()} / $${(tmdb.revenue ?? 0).toLocaleString()}`
          : /* v8 ignore stop */
            '',
    },
    {
      key: 'certification_auto',
      label: 'Certification (Auto)',
      dbDisplay: fmt(movie.certification),
      tmdbDisplay: tmdb.certification ?? '',
    },
    {
      key: 'production_companies',
      label: 'Production Cos.',
      dbDisplay: `${tmdb.dbProductionHouseCount}`,
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
