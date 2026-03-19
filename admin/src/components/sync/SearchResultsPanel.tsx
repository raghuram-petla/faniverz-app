'use client';

import React, { useState, useMemo } from 'react';
import { useImportMovies, useTmdbLookup, useImportActor, useRefreshActor } from '@/hooks/useSync';
import type { TmdbSearchAllResult, LookupResult } from '@/hooks/useSync';
import { Film, Users, Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react';
import type { ImportProgress } from './syncHelpers';
import { ImportProgressList } from './DiscoverResults';
import { PersonPreview } from './PersonPreview';

export interface SearchResultsPanelProps {
  data: TmdbSearchAllResult;
}

/** @contract Shows TMDB search results — movies grid + actors list with import/refresh actions */
export function SearchResultsPanel({ data }: SearchResultsPanelProps) {
  const movieExistingSet = new Set(data.movies.existingTmdbIds);
  const actorExistingSet = new Set(data.actors.existingTmdbPersonIds);

  return (
    <div className="space-y-6">
      {data.actors.results.length > 0 && (
        <ActorSearchResults actors={data.actors.results} existingSet={actorExistingSet} />
      )}
      {data.movies.results.length > 0 && (
        <MovieSearchResults movies={data.movies.results} existingSet={movieExistingSet} />
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
}

function MovieSearchResults({ movies, existingSet }: MovieSearchResultsProps) {
  const importMovies = useImportMovies();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);

  const newMovies = movies.filter((m) => !existingSet.has(m.id));
  const isImporting = importProgress.some((p) => p.status === 'importing');

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
          const exists = existingSet.has(movie.id);
          const isSelected = selected.has(movie.id);
          return (
            <button
              key={movie.id}
              disabled={exists || isImporting}
              onClick={() => toggleSelect(movie.id)}
              className={`relative bg-black rounded-xl overflow-hidden text-left transition-all ${
                exists
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
              {isSelected && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>

      {importProgress.length > 0 && <ImportProgressList items={importProgress} />}
    </div>
  );
}

// ── Actor Results ─────────────────────────────────────────────────────────────

interface ActorSearchResultsProps {
  actors: TmdbSearchAllResult['actors']['results'];
  existingSet: Set<number>;
}

function ActorSearchResults({ actors, existingSet }: ActorSearchResultsProps) {
  const lookup = useTmdbLookup();
  const importActor = useImportActor();
  const refreshActor = useRefreshActor();
  /** @edge tracks TMDB IDs imported this session so grid cards update to "In DB" immediately */
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  /** @edge tracks which actor's details panel is open — null means closed */
  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null);
  const lookupResult = lookup.data as LookupResult | undefined;

  // @invariant merge original existingSet with session-imported IDs
  const mergedExistingSet = useMemo(
    () => new Set([...existingSet, ...importedIds]),
    [existingSet, importedIds],
  );

  const handleLookup = (tmdbId: number) => {
    setSelectedTmdbId(tmdbId);
    lookup.mutate({ tmdbId, type: 'person' });
  };

  const handleClose = () => {
    setSelectedTmdbId(null);
    lookup.reset();
  };

  const handleRefresh = async () => {
    if (!lookupResult || lookupResult.type !== 'person' || !lookupResult.existingId) return;
    await refreshActor.mutateAsync(lookupResult.existingId);
  };

  /** @sideeffect imports actor, updates grid badge — no re-lookup to avoid flash */
  const handleImportActor = async () => {
    if (!lookupResult || lookupResult.type !== 'person') return;
    await importActor.mutateAsync(lookupResult.data.tmdbPersonId);
    setImportedIds((prev) => new Set([...prev, lookupResult.data.tmdbPersonId]));
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
        <Users className="w-4 h-4 text-status-green" />
        Actors ({actors.length})
      </h3>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
      >
        {actors.map((person) => {
          const exists = mergedExistingSet.has(person.id);
          const isSelected = selectedTmdbId === person.id;
          return (
            <React.Fragment key={person.id}>
              <div
                className={`bg-surface-card border rounded-xl p-4 flex items-center gap-3 ${
                  isSelected ? 'border-red-600 ring-1 ring-red-600' : 'border-outline'
                }`}
              >
                {person.profile_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                    alt={person.name}
                    className="w-12 h-16 object-cover rounded-lg shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-16 bg-surface-muted rounded-lg flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-on-surface-disabled" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-on-surface truncate">{person.name}</p>
                  <p className="text-xs text-on-surface-subtle">
                    {person.known_for_department || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {exists ? (
                      <span className="text-xs text-status-green flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> In DB
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-subtle flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Not in DB
                      </span>
                    )}
                    <button
                      onClick={() => (isSelected ? handleClose() : handleLookup(person.id))}
                      disabled={lookup.isPending}
                      className="text-xs text-red-500 hover:text-red-400 font-medium"
                    >
                      {lookup.isPending && selectedTmdbId === person.id
                        ? 'Loading...'
                        : isSelected
                          ? 'Hide'
                          : 'Details'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline detail panel — spans full grid width below the clicked card */}
              {isSelected && lookupResult?.type === 'person' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <PersonPreview
                    result={
                      importedIds.has(lookupResult.data.tmdbPersonId)
                        ? { ...lookupResult, existsInDb: true }
                        : lookupResult
                    }
                    isPending={refreshActor.isPending || importActor.isPending}
                    onRefresh={handleRefresh}
                    onImport={handleImportActor}
                    onClose={handleClose}
                  />
                  {importActor.isSuccess && (
                    <div className="mt-2 bg-green-600/10 border border-green-600/30 rounded-lg px-4 py-3 text-status-green text-sm">
                      Actor imported: {importActor.data?.result?.name}
                    </div>
                  )}
                  {refreshActor.isSuccess && (
                    <div className="mt-2 bg-green-600/10 border border-green-600/30 rounded-lg px-4 py-3 text-status-green text-sm">
                      Actor refreshed. Updated:{' '}
                      {refreshActor.data?.result?.fields?.join(', ') || 'none'}
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
