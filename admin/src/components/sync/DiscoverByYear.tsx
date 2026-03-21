'use client';

import { useState, useMemo } from 'react';
import { useImportMovies, useLinkTmdbId } from '@/hooks/useSync';
import type { DiscoverResult, DuplicateSuspect, ExistingMovieData } from '@/hooks/useSync';
import type { ImportProgress } from './syncHelpers';
import { DiscoverResults, ImportProgressList } from './DiscoverResults';

export interface DiscoverByYearProps {
  /** @boundary Discover mutation result — passed from DiscoverTab */
  data: DiscoverResult;
}

/** @contract Renders discover-by-year results with batch import. Form lives in DiscoverTab. */
export function DiscoverByYear({ data }: DiscoverByYearProps) {
  const importMovies = useImportMovies();
  const linkTmdbId = useLinkTmdbId();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);
  const [gapCount, setGapCount] = useState<number | null>(null);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [importedMovieData, setImportedMovieData] = useState<ExistingMovieData[]>([]);
  const [linkingTmdbId, setLinkingTmdbId] = useState<number | null>(null);

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
      const tmdbMovie = (data.results ?? []).find((m) => m.id === tmdbId);
      const newExisting: ExistingMovieData = {
        id: suspect.id,
        tmdb_id: tmdbId,
        title: suspect.title,
        synopsis: null,
        poster_url: tmdbMovie?.poster_path
          ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
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

  /** @sideeffect batch import — 5 movies per batch */
  const runBatchImport = async (movies: Array<{ id: number; title: string }>) => {
    setImportProgress(
      movies.map((m) => ({ tmdbId: m.id, title: m.title, status: 'pending' as const })),
    );
    const ids = movies.map((m) => m.id);
    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      setImportProgress((prev) =>
        prev.map((p) => (batch.includes(p.tmdbId) ? { ...p, status: 'importing' } : p)),
      );
      try {
        const response = await importMovies.mutateAsync(batch);
        const successResults = response.results;
        if (successResults.length > 0) {
          setImportedIds((prev) => new Set([...prev, ...successResults.map((r) => r.tmdbId)]));
          const tmdbResults = data.results ?? [];
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
            };
          });
          setImportedMovieData((prev) => [...prev, ...newExisting]);
        }
        setImportProgress((prev) =>
          prev.map((p) => {
            if (!batch.includes(p.tmdbId)) return p;
            const result = response.results.find((r) => r.tmdbId === p.tmdbId);
            const error = response.errors.find((e) => e.tmdbId === p.tmdbId);
            if (error) return { ...p, status: 'failed', error: error.message };
            if (result) return { ...p, status: 'done', result };
            return { ...p, status: 'done' };
          }),
        );
      } catch (err) {
        setImportProgress((prev) =>
          prev.map((p) =>
            batch.includes(p.tmdbId)
              ? {
                  ...p,
                  status: 'failed',
                  error: err instanceof Error ? err.message : 'Import failed',
                }
              : p,
          ),
        );
      }
    }
    setSelected(new Set());
  };

  const isImporting = importProgress.some((p) => p.status === 'importing');

  const handleImportAllNew = () => {
    if (newMovies.length === 0 || isImporting) return;
    setSelected(new Set(newMovies.map((m) => m.id)));
    void runBatchImport(newMovies);
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    const moviesList = (data.results ?? []).filter((m) => selected.has(m.id));
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
        importedIds={importedIds}
        duplicateSuspects={data.duplicateSuspects}
        onLinkDuplicate={handleLinkDuplicate}
        linkingTmdbId={linkingTmdbId}
        onGapCountChange={setGapCount}
      />
      {importProgress.length > 0 && <ImportProgressList items={importProgress} />}
    </div>
  );
}
