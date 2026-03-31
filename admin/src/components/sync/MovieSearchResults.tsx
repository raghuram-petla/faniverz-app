'use client';

import { useState, useMemo } from 'react';
import { useImportMovies, useLinkTmdbId } from '@/hooks/useSync';
import type { TmdbSearchAllResult, DuplicateSuspect } from '@/hooks/useSync';
import { Film, Loader2, Download } from 'lucide-react';
import { MovieSearchCard } from './MovieSearchCard';
import type { ImportProgress } from './syncHelpers';
import { ImportProgressList } from './DiscoverResults';
import { usePermissions } from '@/hooks/usePermissions';
import { useLanguageContext } from '@/hooks/useLanguageContext';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useLanguageName } from '@/hooks/useLanguageOptions';

export interface MovieSearchResultsProps {
  movies: TmdbSearchAllResult['movies']['results'];
  existingSet: Set<number>;
  /** @contract Map tmdb_id → local movie id for "Review gaps" links on existing movies */
  existingMovieIds?: Record<number, string>;
  duplicateSuspects?: Record<number, DuplicateSuspect>;
}

/** @contract Shows TMDB movie search results with import, language gating, and duplicate detection */
export function MovieSearchResults({
  movies,
  existingSet,
  existingMovieIds,
  duplicateSuspects,
}: MovieSearchResultsProps) {
  const importMovies = useImportMovies();
  const linkTmdbId = useLinkTmdbId();
  const { languageCodes, isReadOnly } = usePermissions();
  const langName = useLanguageName();
  const { selectedLanguageCode } = useLanguageContext();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<number>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [linkingTmdbId, setLinkingTmdbId] = useState<number | null>(null);

  // @contract Import gating uses BOTH role-based language codes AND the active switcher selection.
  // If the switcher is set (e.g. "Telugu"), only Telugu movies are importable — even for root/super.
  // If the switcher is "All", fall back to role-based codes (empty = all for root/super).
  const activeLanguageFilter = selectedLanguageCode ? [selectedLanguageCode] : languageCodes;
  const hasLanguageRestriction = activeLanguageFilter.length > 0;
  const canImportMovie = (lang: string | undefined) =>
    !hasLanguageRestriction || (lang ? activeLanguageFilter.includes(lang) : true);

  // @contract Default to showing only selected language; toggle switches to all supported languages
  const [filterByLanguage, setFilterByLanguage] = useState(true);
  const filteredCount = hasLanguageRestriction
    ? movies.filter((m) => canImportMovie(m.original_language)).length
    : movies.length;
  const visibleMovies =
    filterByLanguage && hasLanguageRestriction
      ? movies.filter((m) => canImportMovie(m.original_language))
      : movies;

  // @contract merge linked/imported IDs into existing set so movies show "In DB" badge immediately
  const effectiveExistingSet = useMemo(
    () =>
      linkedIds.size > 0 || importedIds.size > 0
        ? new Set([...existingSet, ...linkedIds, ...importedIds])
        : existingSet,
    [existingSet, linkedIds, importedIds],
  );
  const newMovies = visibleMovies.filter(
    (m) =>
      !effectiveExistingSet.has(m.id) &&
      !duplicateSuspects?.[m.id] &&
      canImportMovie(m.original_language),
  );
  const isImporting = importProgress.some((p) => p.status === 'importing');
  // @sideeffect warn user before navigating away during active import
  useUnsavedChangesWarning(
    isImporting,
    'Movies are still being imported. If you leave now, the remaining movies will not be imported. Are you sure you want to leave?',
  );

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

  /** @sideeffect batch import 5/batch; @edge per-movie error tracking, batch continues on failure */
  const handleImport = async () => {
    /* v8 ignore start */
    if (selected.size === 0) return;
    /* v8 ignore stop */

    const toImport = movies.filter((m) => selected.has(m.id));
    const ids = toImport.map((m) => m.id);
    setImportProgress(
      toImport.map((m) => ({ tmdbId: m.id, title: m.title, status: 'pending' as const })),
    );
    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      setImportProgress((prev) =>
        prev.map((p) => (batch.includes(p.tmdbId) ? { ...p, status: 'importing' } : p)),
      );
      try {
        // @edge: use first movie's language for the batch — search results are typically same-language
        const batchLang = toImport.find((m) => batch.includes(m.id))?.original_language;
        const response = await importMovies.mutateAsync({
          tmdbIds: batch,
          originalLanguage: batchLang,
        });
        // @sideeffect track successfully imported IDs so they show "In DB" immediately
        const okIds = batch.filter((id) => !response.errors.find((e) => e.tmdbId === id));
        if (okIds.length) setImportedIds((prev) => new Set([...prev, ...okIds]));
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
          prev.map(
            (p) =>
              /* v8 ignore start */
              batch.includes(p.tmdbId)
                ? { ...p, status: 'failed', error: err instanceof Error ? err.message : 'Failed' }
                : p,
            /* v8 ignore stop */
          ),
        );
      }
    }
    setSelected(new Set());
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <Film className="w-4 h-4 text-status-blue" />
          Movies
        </h3>
        {/* @contract Segmented toggle with counts — "Telugu (3) | All (5)" — defaults to selected language */}
        {hasLanguageRestriction && (
          <div className="inline-flex rounded-lg border border-outline overflow-hidden text-xs font-medium">
            <button
              onClick={() => setFilterByLanguage(true)}
              className={`px-3 py-1 transition-colors ${
                filterByLanguage
                  ? 'bg-red-600 text-white'
                  : 'text-on-surface-muted hover:text-on-surface hover:bg-input'
              }`}
            >
              {selectedLanguageCode
                ? /* v8 ignore start */
                  (langName(selectedLanguageCode) ?? selectedLanguageCode)
                : /* v8 ignore stop */
                  'My languages'}{' '}
              ({filteredCount})
            </button>
            <button
              onClick={() => setFilterByLanguage(false)}
              className={`px-3 py-1 border-l border-outline transition-colors ${
                !filterByLanguage
                  ? 'bg-red-600 text-white'
                  : 'text-on-surface-muted hover:text-on-surface hover:bg-input'
              }`}
            >
              All ({movies.length})
            </button>
          </div>
        )}
        {/* @contract Show plain count when no language restriction (no toggle visible) */}
        {!hasLanguageRestriction && (
          <span className="text-xs text-on-surface-muted">({movies.length})</span>
        )}
        {!isReadOnly && newMovies.length > 0 && (
          <button
            onClick={() => {
              if (selected.size > 0) setSelected(new Set());
              else setSelected(new Set(newMovies.map((m) => m.id)));
            }}
            className="border border-outline hover:border-on-surface-subtle text-on-surface px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          >
            {selected.size > 0 ? 'Deselect all' : `Select all new (${newMovies.length})`}
          </button>
        )}
        {!isReadOnly && selected.size > 0 && (
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
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
      >
        {visibleMovies.map((movie) => (
          <MovieSearchCard
            key={movie.id}
            movie={movie}
            exists={effectiveExistingSet.has(movie.id)}
            localMovieId={existingMovieIds?.[movie.id]}
            isSelected={selected.has(movie.id)}
            isImporting={isImporting}
            languageBlocked={!canImportMovie(movie.original_language)}
            suspect={duplicateSuspects?.[movie.id]}
            linkingTmdbId={linkingTmdbId}
            langName={langName}
            onToggleSelect={toggleSelect}
            onLinkDuplicate={handleLinkDuplicate}
            isReadOnly={isReadOnly}
          />
        ))}
      </div>

      {importProgress.length > 0 && <ImportProgressList items={importProgress} />}
    </div>
  );
}
