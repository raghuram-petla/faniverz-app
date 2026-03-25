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

/** @contract merges applied TMDB field values into local movie + lookup snapshots.
 * Returns both updated objects for optimistic UI updates after fill-fields. */
export function applyTmdbFields(
  movie: ExistingMovieData,
  tmdb: LookupMovieData,
  fields: string[],
): { movie: ExistingMovieData; tmdb: LookupMovieData } {
  const updatedMovie = { ...movie };
  const updatedTmdb = { ...tmdb };
  for (const f of fields) {
    switch (f) {
      case 'title':
        updatedMovie.title = tmdb.title;
        break;
      case 'synopsis':
        updatedMovie.synopsis = tmdb.overview;
        break;
      case 'release_date':
        updatedMovie.release_date = tmdb.releaseDate;
        break;
      case 'poster_url':
        updatedMovie.poster_url = tmdb.posterUrl;
        break;
      case 'backdrop_url':
        updatedMovie.backdrop_url = tmdb.backdropUrl;
        break;
      case 'director':
        updatedMovie.director = tmdb.director;
        break;
      case 'runtime':
        updatedMovie.runtime = tmdb.runtime;
        break;
      case 'genres':
        updatedMovie.genres = tmdb.genres;
        break;
      // @contract: for junction table fields, set DB counts = TMDB counts (fill synced them)
      case 'videos':
        updatedTmdb.dbVideoCount = tmdb.videoCount;
        break;
      case 'images':
        updatedTmdb.dbPosterCount = tmdb.posterCount;
        updatedTmdb.dbBackdropCount = tmdb.backdropCount;
        break;
      case 'keywords':
        updatedTmdb.dbKeywordCount = tmdb.keywordCount;
        break;
      case 'watch_providers':
        updatedTmdb.dbPlatformNames = tmdb.providerNames;
        break;
      case 'production_companies':
        updatedTmdb.dbProductionHouseCount = tmdb.productionCompanyCount;
        break;
      case 'imdb_id':
        updatedMovie.imdb_id = tmdb.imdbId;
        break;
      case 'title_te':
        updatedMovie.title_te = tmdb.titleTe;
        break;
      case 'synopsis_te':
        updatedMovie.synopsis_te = tmdb.synopsisTe;
        break;
      case 'tagline':
        updatedMovie.tagline = tmdb.tagline;
        break;
      case 'tmdb_status':
        updatedMovie.tmdb_status = tmdb.tmdbStatus;
        break;
      case 'tmdb_ratings':
        updatedMovie.tmdb_vote_average = tmdb.tmdbVoteAverage;
        updatedMovie.tmdb_vote_count = tmdb.tmdbVoteCount;
        break;
      case 'budget_revenue':
        updatedMovie.budget = tmdb.budget;
        updatedMovie.revenue = tmdb.revenue;
        break;
      case 'certification_auto':
        updatedMovie.certification = tmdb.certification;
        break;
      case 'spoken_languages':
        updatedMovie.spoken_languages = tmdb.spokenLanguages;
        break;
    }
  }
  return { movie: updatedMovie, tmdb: updatedTmdb };
}
