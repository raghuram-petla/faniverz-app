'use client';

import React, { useState, useMemo } from 'react';
import { useTmdbLookup, useImportActor, useRefreshActor } from '@/hooks/useSync';
import type { TmdbSearchAllResult, LookupResult } from '@/hooks/useSync';
import { Users, CheckCircle, AlertCircle } from 'lucide-react';
import { PersonPreview } from './PersonPreview';

export interface ActorSearchResultsProps {
  actors: TmdbSearchAllResult['actors']['results'];
  existingSet: Set<number>;
  /** @contract: when true, import/refresh buttons are hidden — viewer role */
  isReadOnly?: boolean;
}

/** @contract Shows TMDB actor search results with inline detail panel and import/refresh */
export function ActorSearchResults({ actors, existingSet, isReadOnly }: ActorSearchResultsProps) {
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
    /* v8 ignore start */
    if (!lookupResult || lookupResult.type !== 'person') return;
    /* v8 ignore stop */
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
                    isReadOnly={isReadOnly}
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
