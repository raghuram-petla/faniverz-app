'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useImportMovies, useLinkTmdbId } from '@/hooks/useSync';
import type { DiscoverResult, DuplicateSuspect, ExistingMovieData } from '@/hooks/useSync';
import type { ImportProgress } from './syncHelpers';
import { DiscoverResults } from './DiscoverResults';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

export interface DiscoverByYearProps {
  /** @boundary Discover mutation result — passed from DiscoverTab */
  data: DiscoverResult;
  /** @contract: notifies parent when import starts/stops so tab switching can be blocked */
  onImportingChange?: (importing: boolean) => void;
}

/** @contract Renders discover-by-year results with batch import. Form lives in DiscoverTab. */
export function DiscoverByYear({ data, onImportingChange }: DiscoverByYearProps) {
  const importMovies = useImportMovies();
  const linkTmdbId = useLinkTmdbId();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);
  const [gapCount, setGapCount] = useState<number | null>(null);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [importedMovieData, setImportedMovieData] = useState<ExistingMovieData[]>([]);
  const [linkingTmdbId, setLinkingTmdbId] = useState<number | null>(null);
  // @contract: cancel ref checked between movies — when true, pending movies are skipped
  const cancelledRef = useRef(false);

  const existingMovies = useMemo(
    () => [...((data.existingMovies ?? []) as ExistingMovieData[]), ...importedMovieData],
    [data.existingMovies, importedMovieData],
  );
  const existingSet = useMemo(
    () => new Set([...existingMovies.map((m) => m.tmdb_id), ...importedIds]),
    [existingMovies, importedIds],
  );
  // @contract suspects are excluded from newMovies — they're shown separately with "Link to TMDB"
  const newMovies = useMemo(
    () =>
      (data.results ?? []).filter((m) => !existingSet.has(m.id) && !data.duplicateSuspects?.[m.id]),
    [data.results, existingSet, data.duplicateSuspects],
  );

  /** @sideeffect Links a local movie to a TMDB ID, then transitions it to the existing section */
  const handleLinkDuplicate = async (tmdbId: number, suspect: DuplicateSuspect) => {
    setLinkingTmdbId(tmdbId);
    try {
      await linkTmdbId.mutateAsync({ movieId: suspect.id, tmdbId });
      /* v8 ignore start */
      const tmdbMovie = (data.results ?? []).find((m) => m.id === tmdbId);
      /* v8 ignore stop */
      const newExisting: ExistingMovieData = {
        id: suspect.id,
        tmdb_id: tmdbId,
        title: suspect.title,
        release_date: tmdbMovie?.release_date ?? null,
        synopsis: null,
        poster_url: tmdbMovie?.poster_path
          ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
          : null,
        backdrop_url: null,
        director: null,
        runtime: null,
        genres: null,
        imdb_id: null,
        title_te: null,
        synopsis_te: null,
        tagline: null,
        tmdb_status: null,
        tmdb_vote_average: null,
        tmdb_vote_count: null,
        budget: null,
        revenue: null,
        certification: null,
        spoken_languages: null,
      };
      setImportedMovieData((prev) => [...prev, newExisting]);
      setImportedIds((prev) => new Set([...prev, tmdbId]));
    } finally {
      setLinkingTmdbId(null);
    }
  };

  const toggleSelect = (tmdbId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(tmdbId) ? next.delete(tmdbId) : next.add(tmdbId);
      return next;
    });
  };

  const selectAllNew = () => setSelected(new Set(newMovies.map((m) => m.id)));

  /** @sideeffect import 1 movie at a time with automatic 504 retry for resumable imports */
  const runBatchImport = async (
    movies: Array<{ id: number; title: string; original_language: string }>,
  ) => {
    cancelledRef.current = false;
    setImportProgress(
      movies.map((m) => ({ tmdbId: m.id, title: m.title, status: 'pending' as const })),
    );
    // @contract: batch size 1 — each movie gets its own API call for resumable import
    for (const movie of movies) {
      // @contract: check cancel flag between movies — skip remaining if cancelled
      if (cancelledRef.current) {
        setImportProgress((prev) =>
          prev.map((p) =>
            p.status === 'pending' ? { ...p, status: 'failed', error: 'Cancelled' } : p,
          ),
        );
        break;
      }
      const batch = [movie.id];
      // @contract: retry on 504 — backend saves progress, each retry resumes from checkpoint
      const MAX_RETRIES = 15;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // @contract: iteration is 1-based and shown in UI to indicate resume progress
        setImportProgress((prev) =>
          prev.map((p) =>
            p.tmdbId === movie.id ? { ...p, status: 'importing', iteration: attempt + 1 } : p,
          ),
        );
        try {
          const response = await importMovies.mutateAsync({
            tmdbIds: batch,
            originalLanguage: movie.original_language,
          });
          const successResults = response.results;
          if (successResults.length > 0) {
            setImportedIds((prev) => new Set([...prev, ...successResults.map((r) => r.tmdbId)]));
            /* v8 ignore start */
            const tmdbResults = data.results ?? [];
            /* v8 ignore stop */
            const newExisting: ExistingMovieData[] = successResults.map((r) => {
              const tmdb = tmdbResults.find((m) => m.id === r.tmdbId);
              return {
                id: r.movieId,
                tmdb_id: r.tmdbId,
                title: r.title,
                synopsis: null,
                poster_url: tmdb?.poster_path
                  ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`
                  : null,
                backdrop_url: null,
                trailer_url: null,
                director: null,
                runtime: null,
                genres: null,
                imdb_id: null,
                title_te: null,
                synopsis_te: null,
                tagline: null,
                tmdb_status: null,
                tmdb_vote_average: null,
                tmdb_vote_count: null,
                budget: null,
                revenue: null,
                certification: null,
                spoken_languages: null,
                /* v8 ignore start */
                release_date: tmdb?.release_date ?? null,
                /* v8 ignore stop */
              };
            });
            setImportedMovieData((prev) => [...prev, ...newExisting]);
          }
          setImportProgress((prev) =>
            prev.map((p) => {
              if (p.tmdbId !== movie.id) return p;
              const result = response.results.find((r) => r.tmdbId === p.tmdbId);
              const error = response.errors.find((e) => e.tmdbId === p.tmdbId);
              if (error) return { ...p, status: 'failed', error: error.message };
              if (result) return { ...p, status: 'done', result };
              return { ...p, status: 'done' };
            }),
          );
          break;
        } catch (err) {
          // @edge: 504/502 = gateway timeout — backend was killed but saved progress, retry
          const status = (err as Error & { status?: number }).status;
          const isTimeout = status === 504 || status === 502;
          if (isTimeout && attempt < MAX_RETRIES) {
            // @contract: brief delay before retry to avoid hammering a struggling server
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          // Non-timeout error or retries exhausted — mark as failed
          setImportProgress((prev) =>
            prev.map(
              (p) =>
                p.tmdbId === movie.id
                  ? {
                      ...p,
                      status: 'failed',
                      error: err instanceof Error ? err.message : 'Import failed',
                    }
                  : /* v8 ignore start */
                    p,
              /* v8 ignore stop */
            ),
          );
          break;
        }
      }
    }
    setSelected(new Set());
  };

  const isImporting = importProgress.some((p) => p.status === 'importing');
  // @sideeffect: notify parent so tab switching can be blocked during import
  useEffect(() => {
    onImportingChange?.(isImporting);
  }, [isImporting, onImportingChange]);
  // @sideeffect warn user before navigating away during active import
  useUnsavedChangesWarning(
    isImporting,
    'Movies are still being imported. If you leave now, the remaining movies will not be imported. Are you sure you want to leave?',
  );

  const handleCancelImport = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const handleImportAllNew = () => {
    if (newMovies.length === 0 || isImporting) return;
    setSelected(new Set(newMovies.map((m) => m.id)));
    void runBatchImport(newMovies);
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    /* v8 ignore start */
    const moviesList = (data.results ?? []).filter((m) => selected.has(m.id));
    /* v8 ignore stop */
    await runBatchImport(moviesList);
  };

  return (
    <div className="space-y-6">
      <DiscoverResults
        results={data.results}
        existingMovies={existingMovies}
        existingSet={existingSet}
        newMovies={newMovies}
        selected={selected}
        isImporting={isImporting}
        gapCount={gapCount}
        onToggleSelect={toggleSelect}
        onSelectAllNew={selectAllNew}
        onDeselectAll={() => setSelected(new Set())}
        onImport={handleImport}
        onImportAllNew={handleImportAllNew}
        onCancelImport={handleCancelImport}
        importedIds={importedIds}
        duplicateSuspects={data.duplicateSuspects}
        onLinkDuplicate={handleLinkDuplicate}
        linkingTmdbId={linkingTmdbId}
        onGapCountChange={setGapCount}
        importProgress={importProgress}
      />
    </div>
  );
}
