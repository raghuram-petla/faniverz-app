/**
 * Shared sync utilities used by both hooks (useBulkFillMissing) and components
 * (FieldDiffPanel, ExistingMovieSync).
 *
 * @contract: these helpers are pure functions — no side effects, no API calls.
 * @coupling: depends on ExistingMovieData from useSync.ts for type safety.
 */

import type { ExistingMovieData } from '@/hooks/useSync';

/** Fields the admin can selectively apply from TMDB (excluding 'cast' which is a special action). */
export const FILLABLE_DATA_FIELDS = [
  'title',
  'synopsis',
  'poster_url',
  'backdrop_url',
  'trailer_url',
  'director',
  'runtime',
  'genres',
  'images',
  'videos',
  'watch_providers',
  'keywords',
  'imdb_id',
  'title_te',
  'synopsis_te',
  'tagline',
  'tmdb_status',
  'tmdb_ratings',
  'budget_revenue',
  'certification_auto',
  'production_companies',
  'spoken_languages',
] as const;

export type FillableDataField = (typeof FILLABLE_DATA_FIELDS)[number];

/** All fields that can appear in the fill-fields API request, including 'cast'. */
export type FillableField = FillableDataField | 'cast';

/** Returns the list of data fields that are null/empty in the DB snapshot.
 * Used by bulk fill to determine which fields to request from TMDB. */
export function getMissingFields(m: ExistingMovieData): FillableDataField[] {
  const missing: FillableDataField[] = [];
  if (!m.title) missing.push('title');
  if (!m.synopsis) missing.push('synopsis');
  if (!m.poster_url) missing.push('poster_url');
  if (!m.backdrop_url) missing.push('backdrop_url');
  if (!m.trailer_url) missing.push('trailer_url');
  if (!m.director) missing.push('director');
  // @edge runtime and genres are optional — TMDB often has 0/empty for these,
  // so they're still included for bulk fill (server handles 0→null gracefully)
  if (m.runtime == null) missing.push('runtime');
  if (!m.genres?.length) missing.push('genres');
  if (!m.imdb_id) missing.push('imdb_id');
  if (!m.title_te) missing.push('title_te');
  if (!m.synopsis_te) missing.push('synopsis_te');
  if (!m.tagline) missing.push('tagline');
  if (!m.tmdb_status) missing.push('tmdb_status');
  if (m.tmdb_vote_average == null) missing.push('tmdb_ratings');
  if (m.budget == null && m.revenue == null) missing.push('budget_revenue');
  if (!m.certification) missing.push('certification_auto');
  // @edge: production_companies is an aggregate (junction table count) not available from the
  // discover route's select query — omit from auto-fill to avoid always-missing false positives.
  // Admins can manually select it from the diff panel where the lookup route provides the count.
  if (!m.spoken_languages?.length) missing.push('spoken_languages');
  return missing;
}

/** Count of null/empty fillable fields — drives "N fields empty" badge.
 * @edge this only checks DB data; whether TMDB has the data is unknown until
 * the row is expanded and a TMDB lookup is performed. */
export function countMissing(m: ExistingMovieData): number {
  return getMissingFields(m).length;
}
