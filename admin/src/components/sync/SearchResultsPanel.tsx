'use client';

import { useState, useMemo } from 'react';
import { useImportMovies, useLinkTmdbId } from '@/hooks/useSync';
import type { TmdbSearchAllResult, DuplicateSuspect } from '@/hooks/useSync';
import { Film, Loader2, Download, CheckCircle, AlertTriangle, Link2 } from 'lucide-react';
import type { ImportProgress } from './syncHelpers';
import { ImportProgressList } from './DiscoverResults';
import { ActorSearchResults } from './ActorSearchResults';

export interface SearchResultsPanelProps {
  data: TmdbSearchAllResult;
}

/** @contract Shows TMDB search results — actors list + movies grid with import/refresh actions */
export function SearchResultsPanel({ data }: SearchResultsPanelProps) {
  const movieExistingSet = new Set(data.movies.existingTmdbIds);
  const actorExistingSet = new Set(data.actors.existingTmdbPersonIds);

  return (
    <div className="space-y-6">
      {data.actors.results.length > 0 && (
        <ActorSearchResults actors={data.actors.results} existingSet={actorExistingSet} />
      )}
      {data.movies.results.length > 0 && (
        <MovieSearchResults
          movies={data.movies.results}
          existingSet={movieExistingSet}
          duplicateSuspects={data.movies.duplicateSuspects}
        />
      )}
      {data.movies.results.length === 0 && data.actors.results.length === 0 && (
        <p className="text-sm text-on-surface-muted">No results found.</p>
      )}
    </div>
  );
}

// ── Movie Results ─────────────────────────────────────────────────────────────

interface MovieSearchResultsProps {
  movies: TmdbSearchAllResult['movies']['results'];
  existingSet: Set<number>;
  duplicateSuspects?: Record<number, DuplicateSuspect>;
}

function MovieSearchResults({ movies, existingSet, duplicateSuspects }: MovieSearchResultsProps) {
  const importMovies = useImportMovies();
  const linkTmdbId = useLinkTmdbId();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<number>>(new Set());
  const [linkingTmdbId, setLinkingTmdbId] = useState<number | null>(null);

  // @contract merge linked IDs into existing set so linked movies show "In DB" badge
  const effectiveExistingSet = useMemo(
    () => (linkedIds.size > 0 ? new Set([...existingSet, ...linkedIds]) : existingSet),
    [existingSet, linkedIds],
  );
  const newMovies = movies.filter(
    (m) => !effectiveExistingSet.has(m.id) && !duplicateSuspects?.[m.id],
  );
  const isImporting = importProgress.some((p) => p.status === 'importing');

  const handleLinkDuplicate = async (tmdbId: number, suspect: DuplicateSuspect) => {
    setLinkingTmdbId(tmdbId);
    try {
      await linkTmdbId.mutateAsync({ movieId: suspect.id, tmdbId });
      setLinkedIds((prev) => new Set([...prev, tmdbId]));
    } finally {
      setLinkingTmdbId(null);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /** @sideeffect batch import selected movies — 5 per batch */
  const handleImport = async () => {
    if (selected.size === 0) return;
    const toImport = movies.filter((m) => selected.has(m.id));
    setImportProgress(
      toImport.map((m) => ({ tmdbId: m.id, title: m.title, status: 'pending' as const })),
    );
    const ids = toImport.map((m) => m.id);

    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      setImportProgress((prev) =>
        prev.map((p) => (batch.includes(p.tmdbId) ? { ...p, status: 'importing' } : p)),
      );
      try {
        const response = await importMovies.mutateAsync(batch);
        setImportProgress((prev) =>
          prev.map((p) => {
            if (!batch.includes(p.tmdbId)) return p;
            const error = response.errors.find((e) => e.tmdbId === p.tmdbId);
            if (error) return { ...p, status: 'failed', error: error.message };
            const result = response.results.find((r) => r.tmdbId === p.tmdbId);
            return { ...p, status: 'done', result: result ?? undefined };
          }),
        );
      } catch (err) {
        setImportProgress((prev) =>
          prev.map((p) =>
            batch.includes(p.tmdbId)
              ? { ...p, status: 'failed', error: err instanceof Error ? err.message : 'Failed' }
              : p,
          ),
        );
      }
    }
    setSelected(new Set());
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <Film className="w-4 h-4 text-status-blue" />
          Movies ({movies.length})
        </h3>
        {selected.size > 0 && (
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Import {selected.size} selected
          </button>
        )}
        {newMovies.length > 0 && selected.size === 0 && (
          <button
            onClick={() => setSelected(new Set(newMovies.map((m) => m.id)))}
            className="border border-outline hover:border-on-surface-subtle text-on-surface px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          >
            Select all new ({newMovies.length})
          </button>
        )}
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
      >
        {movies.map((movie) => {
          const exists = effectiveExistingSet.has(movie.id);
          const isSelected = selected.has(movie.id);
          const suspect = duplicateSuspects?.[movie.id];
          return (
            <div key={movie.id}>
              <button
                disabled={exists || isImporting || (!!suspect && !exists)}
                onClick={() => !suspect && toggleSelect(movie.id)}
                className={`relative w-full bg-black rounded-xl overflow-hidden text-left transition-all ${
                  suspect && !exists
                    ? 'ring-2 ring-yellow-500'
                    : exists
                      ? 'opacity-60 cursor-default'
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
                  </p>
                </div>
                {exists && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3" /> In DB
                  </div>
                )}
                {suspect && !exists && (
                  <div className="absolute top-2 right-2 bg-yellow-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Duplicate?
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    Selected
                  </div>
                )}
              </button>
              {suspect && !exists && (
                <div className="mt-1 px-1 space-y-1">
                  <p className="text-[10px] text-status-yellow">
                    Matches &ldquo;{suspect.title}&rdquo; (no TMDB ID)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLinkDuplicate(movie.id, suspect)}
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

      {importProgress.length > 0 && <ImportProgressList items={importProgress} />}
    </div>
  );
}
