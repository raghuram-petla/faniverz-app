'use client';

import { Film, Loader2, Download, CheckCircle, XCircle } from 'lucide-react';
import type { ImportProgress } from './syncHelpers';
import type { ExistingMovieData } from '@/hooks/useSync';
import { ExistingMovieSync } from './ExistingMovieSync';

interface DiscoverMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
}

/** @contract displays TMDB discover results with import status overlay per movie */
export interface DiscoverResultsProps {
  results: DiscoverMovie[];
  /** @boundary Full DB snapshots for existing movies — used for field-level diff UI */
  existingMovies: ExistingMovieData[];
  /** @boundary Set of TMDB IDs already in our DB — these cards show "Imported" badge and are non-selectable */
  existingSet: Set<number>;
  /** @edge derived from results minus existingSet — used for "Select all new" count */
  newMovies: DiscoverMovie[];
  selected: Set<number>;
  isImporting: boolean;
  /** Count of existing movies that have one or more null/empty DB fields */
  gapCount: number;
  onToggleSelect: (tmdbId: number) => void;
  onSelectAllNew: () => void;
  onDeselectAll: () => void;
  /** @sideeffect triggers batch import of selected TMDB IDs via /api/sync/import */
  onImport: () => void;
  /** @sideeffect selects all new movies and immediately triggers import */
  onImportAllNew: () => void;
  /** TMDB IDs of movies imported this session */
  importedIds?: Set<number>;
}

export function DiscoverResults({
  results,
  existingMovies,
  existingSet,
  newMovies,
  selected,
  isImporting,
  gapCount,
  onToggleSelect,
  onSelectAllNew,
  onDeselectAll,
  onImport,
  onImportAllNew,
  importedIds,
}: DiscoverResultsProps) {
  return (
    <>
      {/* ── Summary bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-on-surface-muted">
          Found <span className="text-on-surface font-medium">{results.length}</span>
          {' · '}
          <span className="text-status-green">{existingSet.size} imported</span>
          {' · '}
          <span className="text-status-blue">{newMovies.length} new</span>
          {' · '}
          <span className="text-on-surface-subtle">{gapCount} gaps</span>
        </p>
        {newMovies.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={selected.size > 0 ? onDeselectAll : onSelectAllNew}
              className="border border-outline hover:border-on-surface-subtle text-on-surface px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {selected.size > 0 ? 'Deselect all' : `Select all new (${newMovies.length})`}
            </button>
            <button
              onClick={selected.size > 0 ? onImport : onImportAllNew}
              disabled={isImporting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isImporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {selected.size > 0
                ? `Import ${selected.size} selected`
                : `Import all new (${newMovies.length})`}
            </button>
          </div>
        )}
      </div>

      {/* New-only grid — auto-fill keeps cards ~100px wide; columns adjust to container */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
      >
        {results
          .filter((m) => !existingSet.has(m.id))
          .map((movie) => {
            const isSelected = selected.has(movie.id);
            return (
              <button
                key={movie.id}
                onClick={() => onToggleSelect(movie.id)}
                disabled={isImporting}
                className={`relative bg-black rounded-xl overflow-hidden text-left transition-all ${
                  isSelected
                    ? 'ring-2 ring-red-600'
                    : 'ring-1 ring-outline hover:ring-on-surface-subtle'
                } disabled:cursor-default`}
              >
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                    alt={movie.title}
                    className="block w-full aspect-[2/3] object-cover rounded-t-xl"
                    loading="lazy"
                  />
                ) : (
                  <div className="aspect-[2/3] bg-surface-muted flex items-center justify-center rounded-t-xl">
                    <Film className="w-8 h-8 text-on-surface-disabled" />
                  </div>
                )}
                <div className="p-1.5">
                  <p className="text-xs font-medium text-on-surface truncate">{movie.title}</p>
                  <p className="text-[10px] text-on-surface-subtle mt-0.5">
                    {movie.release_date || 'No date'}
                  </p>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    Selected
                  </div>
                )}
              </button>
            );
          })}
      </div>

      {/* @coupling ExistingMovieSync is only rendered when there are existing movies */}
      {existingMovies.length > 0 && (
        <ExistingMovieSync movies={existingMovies} importedIds={importedIds} />
      )}
    </>
  );
}

export interface ImportProgressListProps {
  items: ImportProgress[];
}

/** @contract renders per-movie import status with spinner/check/error icons */
export function ImportProgressList({ items }: ImportProgressListProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-on-surface">Import Progress</h3>
      {items.map((p) => (
        <div key={p.tmdbId} className="flex items-center gap-3 text-sm">
          {p.status === 'pending' && (
            <div className="w-4 h-4 rounded-full border-2 border-on-surface-disabled" />
          )}
          {p.status === 'importing' && (
            <Loader2 className="w-4 h-4 text-status-blue animate-spin" />
          )}
          {p.status === 'done' && <CheckCircle className="w-4 h-4 text-status-green" />}
          {p.status === 'failed' && <XCircle className="w-4 h-4 text-status-red" />}
          <span
            className={
              p.status === 'done'
                ? 'text-on-surface'
                : p.status === 'failed'
                  ? 'text-status-red'
                  : 'text-on-surface-muted'
            }
          >
            {p.title}
          </span>
          {p.result && (
            <span className="text-xs text-on-surface-subtle">
              ({p.result.castCount} cast, {p.result.crewCount} crew)
            </span>
          )}
          {p.error && <span className="text-xs text-status-red">{p.error}</span>}
        </div>
      ))}
    </div>
  );
}
