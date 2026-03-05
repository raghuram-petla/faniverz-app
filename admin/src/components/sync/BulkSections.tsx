'use client';

import { Film, Users, Loader2, Download, RefreshCw, Eye } from 'lucide-react';
import { formatRelativeTime } from './syncHelpers';

interface StaleItem {
  id: string;
  title?: string;
  name?: string;
  tmdb_last_synced_at?: string | null;
}

interface StaleQueryResult {
  data?: { items: StaleItem[] };
  isLoading: boolean;
}

export interface StaleMoviesSectionProps {
  staleDays: number;
  onStaleDaysChange: (days: number) => void;
  staleMovies: StaleQueryResult;
  showList: boolean;
  onToggleList: () => void;
  onRefreshAll: () => void;
  isBulkRunning: boolean;
}

export function StaleMoviesSection({
  staleDays,
  onStaleDaysChange,
  staleMovies,
  showList,
  onToggleList,
  onRefreshAll,
  isBulkRunning,
}: StaleMoviesSectionProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-on-surface">Stale Movies</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-on-surface-muted">Not synced in</span>
          <select
            value={staleDays}
            onChange={(e) => onStaleDaysChange(Number(e.target.value))}
            className="bg-input rounded-lg px-2 py-1 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {staleMovies.isLoading ? (
        <div className="flex items-center gap-2 text-on-surface-subtle text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-on-surface-muted">
            Found{' '}
            <span className="text-on-surface font-medium">
              {staleMovies.data?.items.length ?? 0}
            </span>{' '}
            movies
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleList}
              disabled={(staleMovies.data?.items.length ?? 0) === 0}
              className="flex items-center gap-1.5 text-sm text-on-surface-muted hover:text-on-surface transition-colors disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5" />
              {showList ? 'Hide' : 'Preview'}
            </button>
            <button
              onClick={onRefreshAll}
              disabled={isBulkRunning || (staleMovies.data?.items.length ?? 0) === 0}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh All
            </button>
          </div>
        </div>
      )}

      {showList && staleMovies.data && (
        <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
          {staleMovies.data.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs py-1 border-b border-outline-subtle"
            >
              <span className="text-on-surface">{item.title}</span>
              <span className="text-on-surface-subtle">
                {item.tmdb_last_synced_at ? formatRelativeTime(item.tmdb_last_synced_at) : 'Never'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface MissingBiosSectionProps {
  missingBios: StaleQueryResult;
  showList: boolean;
  onToggleList: () => void;
  onFetchAll: () => void;
  isBulkRunning: boolean;
}

export function MissingBiosSection({
  missingBios,
  showList,
  onToggleList,
  onFetchAll,
  isBulkRunning,
}: MissingBiosSectionProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-green-400" />
        <h2 className="text-lg font-semibold text-on-surface">Missing Actor Bios</h2>
      </div>

      {missingBios.isLoading ? (
        <div className="flex items-center gap-2 text-on-surface-subtle text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-on-surface-muted">
            <span className="text-on-surface font-medium">
              {missingBios.data?.items.length ?? 0}
            </span>{' '}
            actors with TMDB ID but no biography
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleList}
              disabled={(missingBios.data?.items.length ?? 0) === 0}
              className="flex items-center gap-1.5 text-sm text-on-surface-muted hover:text-on-surface transition-colors disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5" />
              {showList ? 'Hide' : 'Preview'}
            </button>
            <button
              onClick={onFetchAll}
              disabled={isBulkRunning || (missingBios.data?.items.length ?? 0) === 0}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Fetch All Bios
            </button>
          </div>
        </div>
      )}

      {showList && missingBios.data && (
        <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
          {missingBios.data.items.map((item) => (
            <div
              key={item.id}
              className="text-xs py-1 border-b border-outline-subtle text-on-surface"
            >
              {item.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface BulkProgress {
  type: 'movies' | 'actors';
  total: number;
  completed: number;
  current: string;
  errors: string[];
}

export interface BulkProgressPanelProps {
  progress: BulkProgress;
}

export function BulkProgressPanel({ progress }: BulkProgressPanelProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-on-surface">
        {progress.type === 'movies' ? 'Refreshing Movies' : 'Fetching Actor Bios'}
      </h3>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-red-600 transition-all"
            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
          />
        </div>
        <span className="text-sm text-on-surface-muted whitespace-nowrap">
          {progress.completed}/{progress.total}
        </span>
      </div>
      {progress.current && progress.completed < progress.total && (
        <p className="text-xs text-on-surface-subtle flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          {progress.current}
        </p>
      )}
      {progress.completed === progress.total && (
        <p className="text-xs text-green-400">
          Complete! {progress.errors.length > 0 && `${progress.errors.length} errors.`}
        </p>
      )}
      {progress.errors.length > 0 && (
        <div className="text-xs text-red-400 space-y-0.5 max-h-20 overflow-y-auto">
          {progress.errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}
    </div>
  );
}
