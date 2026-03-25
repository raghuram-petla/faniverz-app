// @contract Shared movie constants used by both edit forms and filter panels
// @coupling Must stay in sync with mobile app's recognized genres in src/constants/
// @edge TMDB uses different genre names (e.g. "Science Fiction" not "Sci-Fi") — the sync
// engine stores TMDB's genre names directly, so a TMDB-synced movie may have genres not in
// this list. The admin genre picker only shows these options; TMDB-only genres appear as
// plain text but can't be toggled on/off without manual DB edits.

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

// @coupling: these are CBFC (India) certifications. TMDB sync (extractIndiaCertification)
// maps TMDB's release_dates cert field to these values. Non-Indian certifications (e.g. MPAA
// "PG-13") are not supported and will be stored as-is if manually entered.
export const CERTIFICATION_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'U', label: 'U' },
  { value: 'UA', label: 'UA' },
  { value: 'A', label: 'A' },
];
