// @contract Re-exports shared movie constants for admin usage
export { GENRES } from '@shared/movie-genres';

// @coupling: these are CBFC (India) certifications. TMDB sync (extractIndiaCertification)
// maps TMDB's release_dates cert field to these values. Non-Indian certifications (e.g. MPAA
// "PG-13") are not supported and will be stored as-is if manually entered.
export const CERTIFICATION_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'U', label: 'U' },
  { value: 'UA', label: 'UA' },
  { value: 'A', label: 'A' },
];
