'use client';

import { useState } from 'react';
import { useTmdbLookup, useImportMovies, useRefreshActor } from '@/hooks/useSync';
import type { LookupResult } from '@/hooks/useSync';
import { PersonPreview } from './PersonPreview';
import { Search, Film, Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react';

/** @contract TMDB lookup + import by ID for both movies and persons */
export function ImportTab() {
  const [type, setType] = useState<'movie' | 'person'>('movie');
  const [tmdbId, setTmdbId] = useState('');
  const lookup = useTmdbLookup();
  const importMovies = useImportMovies();
  const refreshActor = useRefreshActor();

  const result = lookup.data as LookupResult | undefined;

  const handleLookup = () => {
    const id = parseInt(tmdbId, 10);
    if (!id) return;
    lookup.mutate({ tmdbId: id, type });
  };

  /**
   * @sideeffect imports movie and re-runs lookup to refresh existsInDb status
   * @edge only handles movies — person import must go through movie import (cast association)
   */
  const handleImport = async () => {
    if (!result) return;
    if (result.type === 'movie') {
      await importMovies.mutateAsync([result.data.tmdbId]);
      lookup.mutate({ tmdbId: result.data.tmdbId, type: 'movie' });
    }
  };

  /**
   * @assumes existingId is the internal UUID for the person in our DB
   * @sideeffect re-runs lookup after refresh to update displayed data
   */
  const handleRefreshPerson = async () => {
    if (!result || result.type !== 'person' || !result.existingId) return;
    await refreshActor.mutateAsync(result.existingId);
    lookup.mutate({ tmdbId: result.data.tmdbPersonId, type: 'person' });
  };

  const isPending = importMovies.isPending || refreshActor.isPending;

  return (
    <div className="space-y-6">
      <LookupForm
        type={type}
        tmdbId={tmdbId}
        isPending={lookup.isPending}
        onTypeChange={(t) => {
          setType(t);
          lookup.reset();
        }}
        onTmdbIdChange={setTmdbId}
        onLookup={handleLookup}
      />

      {lookup.isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {lookup.error instanceof Error ? lookup.error.message : 'Lookup failed'}
        </div>
      )}

      {result?.type === 'movie' && (
        <MoviePreview result={result} isPending={isPending} onImport={handleImport} />
      )}

      {result?.type === 'person' && (
        <PersonPreview result={result} isPending={isPending} onRefresh={handleRefreshPerson} />
      )}

      {importMovies.isSuccess && (
        <div className="bg-green-600/10 border border-green-600/30 rounded-lg px-4 py-3 text-green-400 text-sm">
          Import completed successfully.
        </div>
      )}
      {refreshActor.isSuccess && (
        <div className="bg-green-600/10 border border-green-600/30 rounded-lg px-4 py-3 text-green-400 text-sm">
          Actor refreshed successfully. Updated fields:{' '}
          {refreshActor.data?.result?.fields?.join(', ') || 'none'}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

export interface LookupFormProps {
  type: 'movie' | 'person';
  tmdbId: string;
  isPending: boolean;
  onTypeChange: (type: 'movie' | 'person') => void;
  onTmdbIdChange: (id: string) => void;
  onLookup: () => void;
}

function LookupForm({
  type,
  tmdbId,
  isPending,
  onTypeChange,
  onTmdbIdChange,
  onLookup,
}: LookupFormProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5">
      <h2 className="text-lg font-semibold text-on-surface mb-4">Import by TMDB ID</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-on-surface-muted mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value as 'movie' | 'person')}
            className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="movie">Movie</option>
            <option value="person">Person</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-on-surface-muted mb-1">TMDB ID</label>
          <input
            type="number"
            value={tmdbId}
            onChange={(e) => onTmdbIdChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLookup()}
            placeholder="e.g. 823464"
            className="w-full bg-input rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <button
          onClick={onLookup}
          disabled={isPending || !tmdbId}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Lookup
        </button>
      </div>
    </div>
  );
}

export interface MoviePreviewProps {
  result: LookupResult & { type: 'movie' };
  isPending: boolean;
  onImport: () => void;
}

/** @contract shows TMDB movie details with import/re-sync action; existsInDb controls button label */
function MoviePreview({ result, isPending, onImport }: MoviePreviewProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5">
      <div className="flex gap-5">
        {result.data.posterUrl ? (
          <img
            src={result.data.posterUrl}
            alt={result.data.title}
            className="w-32 h-48 object-cover rounded-lg shrink-0"
          />
        ) : (
          <div className="w-32 h-48 bg-surface-muted rounded-lg flex items-center justify-center shrink-0">
            <Film className="w-8 h-8 text-on-surface-disabled" />
          </div>
        )}
        <div className="space-y-2 min-w-0">
          <h3 className="text-lg font-semibold text-on-surface">{result.data.title}</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-on-surface-subtle">Release:</span>{' '}
              <span className="text-on-surface">{result.data.releaseDate || '—'}</span>
            </div>
            <div>
              <span className="text-on-surface-subtle">Runtime:</span>{' '}
              <span className="text-on-surface">
                {result.data.runtime ? `${result.data.runtime} min` : '—'}
              </span>
            </div>
            <div>
              <span className="text-on-surface-subtle">Director:</span>{' '}
              <span className="text-on-surface">{result.data.director || '—'}</span>
            </div>
            <div>
              <span className="text-on-surface-subtle">Cast:</span>{' '}
              <span className="text-on-surface">{result.data.castCount} members</span>
            </div>
            <div className="col-span-2">
              <span className="text-on-surface-subtle">Genres:</span>{' '}
              <span className="text-on-surface">
                {(result.data.genres ?? []).join(', ') || '—'}
              </span>
            </div>
          </div>
          {result.data.overview && (
            <p className="text-sm text-on-surface-muted line-clamp-3">{result.data.overview}</p>
          )}
          <div className="flex items-center gap-3 pt-2">
            {result.existsInDb ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" /> Already in database
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-yellow-400">
                <AlertCircle className="w-4 h-4" /> Not in database
              </span>
            )}
            <button
              onClick={onImport}
              disabled={isPending}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {result.existsInDb ? 'Re-sync from TMDB' : 'Import Movie'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
