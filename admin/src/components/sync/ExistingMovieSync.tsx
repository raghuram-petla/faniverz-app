'use client';

// @contract: collapsible per-movie field-diff UI for existing movies
// @coupling: useBulkFillMissing handles sequential fill; FieldDiffPanel handles diff UI

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { type ExistingMovieData, type LookupMovieData } from '@/hooks/useSync';
import { supabase } from '@/lib/supabase-browser';
import { useBulkFillMissing } from '@/hooks/useBulkFillMissing';
import { FILLABLE_DATA_FIELDS } from '@/lib/syncUtils';
import { getStatus } from './fieldDiffHelpers';
import { applyTmdbFields } from './syncHelpers';
import { ExistingMovieRow } from './ExistingMovieRow';

export interface ExistingMovieSyncProps {
  movies: ExistingMovieData[];
  /** TMDB IDs of movies imported this session — shown with "Just imported" badge */
  importedIds?: Set<number>;
  /** @nullable callback to propagate gap count to parent for summary bar */
  onGapCountChange?: (count: number | null) => void;
}

/** @contract collapsible section: header shows counts + bulk fill; body shows per-movie rows */
export function ExistingMovieSync({
  movies: moviesProp,
  importedIds,
  onGapCountChange,
}: ExistingMovieSyncProps) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const bulk = useBulkFillMissing();
  // @contract local movie state — updated after bulk fill to reflect applied fields
  const [localMovies, setLocalMovies] = useState(moviesProp);
  // @edge sync with prop when moviesProp changes (e.g. new discover)
  useEffect(() => setLocalMovies(moviesProp), [moviesProp]);
  const movies = localMovies;

  // @sideeffect auto-fetch TMDB details for all existing movies on mount
  const [tmdbMap, setTmdbMap] = useState<Map<number, LookupMovieData>>(new Map());
  const [fetchingCount, setFetchingCount] = useState(0);

  useEffect(() => {
    const moviesToFetch = movies.filter(
      (m) => !importedIds?.has(m.tmdb_id) && !tmdbMap.has(m.tmdb_id),
    );
    if (moviesToFetch.length === 0) return;

    setFetchingCount(moviesToFetch.length);
    let cancelled = false;

    (async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token || cancelled) return;

      // @edge sequential fetches to avoid TMDB rate limits (40 req/10s)
      for (const m of moviesToFetch) {
        if (cancelled) break;
        try {
          const res = await fetch('/api/sync/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ tmdbId: m.tmdb_id, type: 'movie' }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.type === 'movie') {
              setTmdbMap((prev) => new Map(prev).set(m.tmdb_id, data.data));
            }
          }
        } catch {
          /* skip failed lookups */
        }
        setFetchingCount((c) => c - 1);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies.length]);

  // @contract gap count = total mismatched fields across all existing movies with TMDB data
  const gapCount = useMemo(() => {
    if (tmdbMap.size === 0) return 0;
    let total = 0;
    for (const m of movies) {
      const tmdb = tmdbMap.get(m.tmdb_id);
      if (!tmdb) continue;
      total += FILLABLE_DATA_FIELDS.filter((f) => getStatus(m, tmdb, f) !== 'same').length;
    }
    return total;
  }, [movies, tmdbMap]);

  const isLoading = fetchingCount > 0;

  useEffect(() => {
    onGapCountChange?.(isLoading ? null : gapCount);
  }, [gapCount, isLoading, onGapCountChange]);

  // @sideeffect called by ExistingMovieRow after per-movie apply — update localMovies so gap count recalculates
  const handleMovieUpdated = useCallback((updated: ExistingMovieData) => {
    setLocalMovies((prev) => prev.map((m) => (m.tmdb_id === updated.tmdb_id ? updated : m)));
  }, []);

  const handleBulkFill = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await bulk.run(movies, tmdbMap);
    // @sideeffect optimistically update all movies with TMDB values for gapped fields
    setLocalMovies((prev) =>
      prev.map((m) => {
        const tmdb = tmdbMap.get(m.tmdb_id);
        if (!tmdb) return m;
        const gappedFields = FILLABLE_DATA_FIELDS.filter((f) => getStatus(m, tmdb, f) !== 'same');
        return gappedFields.length > 0 ? applyTmdbFields(m, tmdb, gappedFields) : m;
      }),
    );
  };

  return (
    <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
      {/* @edge: outer toggle is a div (not button) — the inner "Fill all missing" is a button,
          and nested <button> inside <button> is invalid HTML per the spec. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setSectionOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSectionOpen((o) => !o);
          }
        }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-elevated transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {sectionOpen ? (
            <ChevronDown className="w-4 h-4 text-on-surface-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-on-surface-muted" />
          )}
          <span className="text-sm font-semibold text-on-surface">Existing movies</span>
          <span className="text-xs text-on-surface-muted">({movies.length})</span>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && (
            <span className="text-xs text-on-surface-muted flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking {fetchingCount}...
            </span>
          )}
          {bulk.state.isRunning ? (
            <span className="text-xs text-on-surface-muted flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {bulk.state.done}/{bulk.state.total}
            </span>
          ) : (
            !isLoading &&
            gapCount > 0 && (
              <button
                onClick={(e) => void handleBulkFill(e)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Fill all missing ({gapCount})
              </button>
            )
          )}
          {!bulk.state.isRunning && bulk.state.total > 0 && (
            <span className="text-xs text-status-green">
              {bulk.state.done} filled
              {bulk.state.failed > 0 && `, ${bulk.state.failed} failed`}
            </span>
          )}
          {bulk.state.error && <span className="text-xs text-status-red">{bulk.state.error}</span>}
          {!isLoading && gapCount > 0 && (
            <span className="text-xs text-status-yellow">{gapCount} gaps</span>
          )}
          {!isLoading && gapCount === 0 && tmdbMap.size > 0 && (
            <span className="text-xs text-status-green">No gaps</span>
          )}
        </div>
      </div>

      {sectionOpen && (
        <div className="divide-y divide-outline">
          {movies.map((movie) => (
            <ExistingMovieRow
              key={movie.tmdb_id}
              movie={movie}
              justImported={importedIds?.has(movie.tmdb_id) ?? false}
              prefetchedTmdb={tmdbMap.get(movie.tmdb_id) ?? null}
              onMovieUpdated={handleMovieUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
