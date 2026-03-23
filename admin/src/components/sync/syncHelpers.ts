import type { ImportMovieResult, ExistingMovieData, LookupMovieData } from '@/hooks/useSync';

export interface ImportProgress {
  tmdbId: number;
  title: string;
  status: 'pending' | 'importing' | 'done' | 'failed';
  result?: ImportMovieResult;
  error?: string;
  /** @contract: current iteration number (1-based) — shown during import to indicate resume progress */
  iteration?: number;
}

export function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'In progress...';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const statusStyles: Record<string, { bg: string; text: string }> = {
  running: { bg: 'bg-blue-600/20', text: 'text-status-blue' },
  success: { bg: 'bg-green-600/20', text: 'text-status-green' },
  failed: { bg: 'bg-red-600/20', text: 'text-status-red' },
};

// @edge: CURRENT_YEAR is computed at module load time (import), NOT at render time.
// If the admin panel stays open across midnight on Dec 31, the year dropdown still
// shows the old year until the browser tab is reloaded. The "+1" in YEARS means
// the dropdown includes next year for pre-release movie syncing.
// @edge: YEARS extends back to 1900 — one year at a time, not bulk sync.
export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from(
  { length: CURRENT_YEAR + 2 - 1900 },
  (_, i) => CURRENT_YEAR + 1 - i,
);
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** @contract merges applied TMDB field values into a local movie snapshot */
export function applyTmdbFields(
  movie: ExistingMovieData,
  tmdb: LookupMovieData,
  fields: string[],
): ExistingMovieData {
  const updated = { ...movie };
  for (const f of fields) {
    switch (f) {
      case 'title':
        updated.title = tmdb.title;
        break;
      case 'synopsis':
        updated.synopsis = tmdb.overview;
        break;
      case 'poster_url':
        updated.poster_url = tmdb.posterUrl;
        break;
      case 'backdrop_url':
        updated.backdrop_url = tmdb.backdropUrl;
        break;
      case 'director':
        updated.director = tmdb.director;
        break;
      case 'runtime':
        updated.runtime = tmdb.runtime;
        break;
      case 'genres':
        updated.genres = tmdb.genres;
        break;
    }
  }
  return updated;
}
