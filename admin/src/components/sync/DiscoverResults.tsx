'use client';

import { Film, Loader2, Download, CheckCircle, XCircle } from 'lucide-react';
import type { ImportProgress } from './syncHelpers';

interface DiscoverMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
}

/** @contract displays TMDB discover results with import status overlay per movie */
export interface DiscoverResultsProps {
  results: DiscoverMovie[];
  /** @boundary Set of TMDB IDs already in our DB — these cards show "Imported" badge and are non-selectable */
  existingSet: Set<number>;
  /** @edge derived from results minus existingSet — used for "Select all new" count */
  newMovies: DiscoverMovie[];
  selected: Set<number>;
  isImporting: boolean;
  onToggleSelect: (tmdbId: number) => void;
  onSelectAllNew: () => void;
  /** @sideeffect triggers batch import of selected TMDB IDs via /api/sync/import */
  onImport: () => void;
}

export function DiscoverResults({
  results,
  existingSet,
  newMovies,
  selected,
  isImporting,
  onToggleSelect,
  onSelectAllNew,
  onImport,
}: DiscoverResultsProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-muted">
          Found <span className="text-on-surface font-medium">{results.length}</span> movies
          {' · '}
          <span className="text-green-400">{existingSet.size} imported</span>
          {' · '}
          <span className="text-blue-400">{newMovies.length} new</span>
        </p>
        <div className="flex items-center gap-2">
          {newMovies.length > 0 && (
            <button
              onClick={onSelectAllNew}
              className="text-xs text-on-surface-muted hover:text-on-surface transition-colors"
            >
              Select all new ({newMovies.length})
            </button>
          )}
          {selected.size > 0 && (
            <button
              onClick={onImport}
              disabled={isImporting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isImporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Import {selected.size} selected
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {results.map((movie) => {
          const isExisting = existingSet.has(movie.id);
          const isSelected = selected.has(movie.id);
          return (
            <button
              key={movie.id}
              onClick={() => !isExisting && onToggleSelect(movie.id)}
              disabled={isExisting || isImporting}
              className={`relative bg-surface-card border rounded-xl overflow-hidden text-left transition-all ${
                isSelected
                  ? 'border-red-600 ring-1 ring-red-600'
                  : isExisting
                    ? 'border-outline opacity-60'
                    : 'border-outline hover:border-on-surface-subtle'
              } disabled:cursor-default`}
            >
              <div className="aspect-[2/3] bg-surface-muted">
                {/* @boundary TMDB image URL constructed from poster_path — depends on TMDB CDN */}
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-8 h-8 text-on-surface-disabled" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-medium text-on-surface line-clamp-2 leading-tight">
                  {movie.title}
                </p>
                <p className="text-xs text-on-surface-subtle mt-1">
                  {movie.release_date || 'No date'}
                </p>
              </div>
              {isExisting && (
                <div className="absolute top-2 right-2 bg-green-600/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle className="w-2.5 h-2.5" /> Imported
                </div>
              )}
              {isSelected && !isExisting && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>
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
          {p.status === 'importing' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
          {p.status === 'done' && <CheckCircle className="w-4 h-4 text-green-400" />}
          {p.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
          <span
            className={
              p.status === 'done'
                ? 'text-on-surface'
                : p.status === 'failed'
                  ? 'text-red-400'
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
          {p.error && <span className="text-xs text-red-400">{p.error}</span>}
        </div>
      ))}
    </div>
  );
}
