/**
 * @contract Single source of truth for the app's genre list.
 * Used by both mobile discover filters and admin genre picker.
 *
 * @edge TMDB uses different genre names (e.g. "Science Fiction" not "Sci-Fi") — the sync
 * engine stores TMDB's genre names directly, so a TMDB-synced movie may have genres not in
 * this list. The admin genre picker only shows these options; TMDB-only genres appear as
 * plain text but can't be toggled on/off without manual DB edits.
 *
 * @invariant Must stay in sync with the genres column values in the movies table.
 */
export const GENRES = [
  'Action',
  'Drama',
  'Comedy',
  'Romance',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Fantasy',
  'Crime',
  'Family',
  'Adventure',
  'Historical',
] as const;

export type Genre = (typeof GENRES)[number];
