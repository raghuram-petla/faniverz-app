'use client';

import { Film, Loader2, Download, CheckCircle, XCircle, AlertTriangle, Link2 } from 'lucide-react';
import type { ImportProgress } from './syncHelpers';
import type { ExistingMovieData, DuplicateSuspect } from '@/hooks/useSync';
import { ExistingMovieSync } from './ExistingMovieSync';
import { LANGUAGE_OPTIONS } from '@/lib/movie-constants';

interface DiscoverMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  original_language?: string;
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
  /** Gap count from ExistingMovieSync — null while still loading */
  gapCount: number | null;
  onToggleSelect: (tmdbId: number) => void;
  onSelectAllNew: () => void;
  onDeselectAll: () => void;
  /** @sideeffect triggers batch import of selected TMDB IDs via /api/sync/import */
  onImport: () => void;
  /** @sideeffect selects all new movies and immediately triggers import */
  onImportAllNew: () => void;
  /** @sideeffect cancels ongoing and pending imports */
  onCancelImport?: () => void;
  /** TMDB IDs of movies imported this session */
  importedIds?: Set<number>;
  /** @nullable TMDB ID → local movie with matching title but no tmdb_id */
  duplicateSuspects?: Record<number, DuplicateSuspect>;
  /** @sideeffect links a suspect's local movie to the TMDB ID */
  onLinkDuplicate?: (tmdbId: number, suspect: DuplicateSuspect) => void;
  /** TMDB ID currently being linked (for spinner state) */
  linkingTmdbId?: number | null;
  /** @nullable callback from ExistingMovieSync to propagate gap count */
  onGapCountChange?: (count: number | null) => void;
  /** @contract import progress items — shown between buttons and movie grid */
  importProgress?: ImportProgress[];
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
  onCancelImport,
  importedIds,
  duplicateSuspects,
  onLinkDuplicate,
  linkingTmdbId,
  onGapCountChange,
  importProgress,
}: DiscoverResultsProps) {
  return (
    <>
      {/* ── Summary bar ── */}
      <div className="flex items-center flex-wrap gap-3">
        <p className="text-sm text-on-surface-muted">
          Found <span className="text-on-surface font-medium">{results.length}</span>
          {' · '}
          <span className="text-status-green">{existingSet.size} imported</span>
          {' · '}
          <span className="text-status-blue">{newMovies.length} new</span>
          {gapCount !== null && (
            <>
              {' · '}
              <span className={gapCount > 0 ? 'text-status-yellow' : 'text-status-green'}>
                {gapCount} gaps
              </span>
            </>
          )}
          {gapCount === null && existingSet.size > 0 && (
            <>
              {' · '}
              <span className="text-on-surface-subtle">checking gaps...</span>
            </>
          )}
        </p>
        {newMovies.length > 0 && !isImporting && (
          <button
            onClick={selected.size > 0 ? onDeselectAll : onSelectAllNew}
            className="border border-outline hover:border-on-surface-subtle text-on-surface px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          >
            {selected.size > 0 ? 'Deselect all' : `Select all new (${newMovies.length})`}
          </button>
        )}
        {selected.size > 0 && !isImporting && (
          <button
            onClick={onImport}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Import {selected.size} selected
          </button>
        )}
        {newMovies.length > 0 && selected.size === 0 && !isImporting && (
          <button
            onClick={onImportAllNew}
            className="flex items-center gap-2 bg-red-600/80 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Import all new ({newMovies.length})
          </button>
        )}
        {isImporting && onCancelImport && (
          <button
            onClick={onCancelImport}
            className="flex items-center gap-2 border border-status-red text-status-red hover:bg-status-red/10 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel import
          </button>
        )}
      </div>

      {/* @contract: progress list between buttons and grid so user sees it immediately */}
      {importProgress && importProgress.length > 0 && <ImportProgressList items={importProgress} />}

      {/* New-only grid — auto-fill keeps cards ~100px wide; columns adjust to container */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
      >
        {results
          .filter((m) => !existingSet.has(m.id))
          .map((movie) => {
            const isSelected = selected.has(movie.id);
            const suspect = duplicateSuspects?.[movie.id];
            return (
              <div key={movie.id}>
                <button
                  onClick={() => !suspect && onToggleSelect(movie.id)}
                  disabled={isImporting || !!suspect}
                  className={`relative w-full bg-black rounded-xl overflow-hidden text-left transition-all ${
                    suspect
                      ? 'ring-2 ring-yellow-500'
                      : isSelected
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
                      {movie.original_language && (
                        <span className="ml-1.5 text-on-surface-muted">
                          ·{' '}
                          {LANGUAGE_OPTIONS.find((o) => o.value === movie.original_language)
                            ?.label ?? movie.original_language}
                        </span>
                      )}
                    </p>
                  </div>
                  {suspect && (
                    <div className="absolute top-2 right-2 bg-yellow-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> Duplicate?
                    </div>
                  )}
                  {isSelected && !suspect && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                      Selected
                    </div>
                  )}
                </button>
                {suspect && (
                  <div className="mt-1 px-1 space-y-1">
                    <p className="text-[10px] text-status-yellow">
                      Matches &ldquo;{suspect.title}&rdquo; (no TMDB ID)
                    </p>
                    <div className="flex items-center gap-2">
                      {onLinkDuplicate && (
                        <button
                          onClick={() => onLinkDuplicate(movie.id, suspect)}
                          disabled={linkingTmdbId === movie.id}
                          className="text-[10px] bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-0.5 rounded-full font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {linkingTmdbId === movie.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Link2 className="w-3 h-3" />
                          )}
                          Link to TMDB
                        </button>
                      )}
                      <a
                        href={`/movies/${suspect.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-on-surface-subtle underline hover:text-yellow-300"
                      >
                        Edit instead
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* @coupling ExistingMovieSync is only rendered when there are existing movies */}
      {existingMovies.length > 0 && (
        <ExistingMovieSync
          movies={existingMovies}
          importedIds={importedIds}
          onGapCountChange={onGapCountChange}
        />
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
          {p.status === 'importing' && p.iteration && p.iteration > 1 && (
            <span className="text-xs text-status-blue">iteration {p.iteration}</span>
          )}
          {p.result && (
            <span className="text-xs text-on-surface-subtle">
              ({p.result.castCount} cast, {p.result.crewCount} crew, {p.result.posterCount} posters,{' '}
              {p.result.backdropCount} backdrops)
            </span>
          )}
          {p.error && <span className="text-xs text-status-red">{p.error}</span>}
        </div>
      ))}
    </div>
  );
}
