/**
 * Shared sync utilities used by both hooks (useBulkFillMissing) and components
 * (FieldDiffPanel, ExistingMovieSync).
 *
 * @contract: these helpers are pure functions — no side effects, no API calls.
 */

/** Fields the admin can selectively apply from TMDB (excluding 'cast' which is a special action).
 * @coupling: the fill-fields API route (/api/sync/fill-fields) must handle every field
 * listed here. Adding a field here without a server-side handler causes a silent no-op —
 * the admin sees "1 field filled" but nothing actually changes in the DB.
 * @coupling: getStatus() in fieldDiffHelpers.ts must have a matching case for each field —
 * if a field is listed here but getStatus returns 'same' for it, bulk fill skips it.
 * @coupling: applyTmdbFields in the mobile app's optimistic update must also mirror these fields.
 */
export const FILLABLE_DATA_FIELDS = [
  'title',
  'synopsis',
  'release_date',
  'poster_url',
  'backdrop_url',
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
