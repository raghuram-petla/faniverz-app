'use client';

import { useState, useMemo } from 'react';
import { useImportMovies, useLinkTmdbId } from '@/hooks/useSync';
import type { TmdbSearchAllResult, DuplicateSuspect } from '@/hooks/useSync';
import { Film, Loader2, Download, CheckCircle, AlertTriangle, Link2, Ban } from 'lucide-react';
import type { ImportProgress } from './syncHelpers';
import { ImportProgressList } from './DiscoverResults';
import { usePermissions } from '@/hooks/usePermissions';
import { useLanguageContext } from '@/hooks/useLanguageContext';
import { LANGUAGE_OPTIONS } from '@/lib/movie-constants';

export interface MovieSearchResultsProps {
  movies: TmdbSearchAllResult['movies']['results'];
  existingSet: Set<number>;
  duplicateSuspects?: Record<number, DuplicateSuspect>;
}

/** @contract Shows TMDB movie search results with import, language gating, and duplicate detection */
export function MovieSearchResults({
  movies,
  existingSet,
  duplicateSuspects,
}: MovieSearchResultsProps) {
  const importMovies = useImportMovies();
  const linkTmdbId = useLinkTmdbId();
  const { languageCodes } = usePermissions();
  const { selectedLanguageCode } = useLanguageContext();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<number>>(new Set());
  const [linkingTmdbId, setLinkingTmdbId] = useState<number | null>(null);

  // @contract Import gating uses BOTH role-based language codes AND the active switcher selection.
  // If the switcher is set (e.g. "Telugu"), only Telugu movies are importable — even for root/super.
  // If the switcher is "All", fall back to role-based codes (empty = all for root/super).
  const activeLanguageFilter = selectedLanguageCode ? [selectedLanguageCode] : languageCodes;
  const hasLanguageRestriction = activeLanguageFilter.length > 0;
  const canImportMovie = (lang: string | undefined) =>
    !hasLanguageRestriction || (lang ? activeLanguageFilter.includes(lang) : true);

  const [filterByLanguage, setFilterByLanguage] = useState(false);
  const visibleMovies =
    filterByLanguage && hasLanguageRestriction
      ? movies.filter((m) => canImportMovie(m.original_language))
      : movies;

  // @contract merge linked IDs into existing set so linked movies show "In DB" badge
  const effectiveExistingSet = useMemo(
    () => (linkedIds.size > 0 ? new Set([...existingSet, ...linkedIds]) : existingSet),
    [existingSet, linkedIds],
  );
  const newMovies = visibleMovies.filter(
    (m) =>
      !effectiveExistingSet.has(m.id) &&
      !duplicateSuspects?.[m.id] &&
      canImportMovie(m.original_language),
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
      <div className="flex items-center flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <Film className="w-4 h-4 text-status-blue" />
          Movies ({visibleMovies.length}
          {filterByLanguage && hasLanguageRestriction ? `/${movies.length}` : ''})
        </h3>
        {/* @contract Segmented toggle — "All languages | Telugu" — shown when language restriction is active */}
        {hasLanguageRestriction && (
          <div className="inline-flex rounded-lg border border-outline overflow-hidden text-xs font-medium">
            <button
              onClick={() => setFilterByLanguage(false)}
              className={`px-3 py-1 transition-colors ${
                !filterByLanguage
                  ? 'bg-red-600 text-white'
                  : 'text-on-surface-muted hover:text-on-surface hover:bg-input'
              }`}
            >
              All languages
            </button>
            <button
              onClick={() => setFilterByLanguage(true)}
              className={`px-3 py-1 border-l border-outline transition-colors ${
                filterByLanguage
                  ? 'bg-red-600 text-white'
                  : 'text-on-surface-muted hover:text-on-surface hover:bg-input'
              }`}
            >
              {selectedLanguageCode
                ? (LANGUAGE_OPTIONS.find((o) => o.value === selectedLanguageCode)?.label ??
                  selectedLanguageCode)
                : 'My languages'}
            </button>
          </div>
        )}
        {newMovies.length > 0 && (
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
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
      >
        {visibleMovies.map((movie) => {
          const exists = effectiveExistingSet.has(movie.id);
          const isSelected = selected.has(movie.id);
          const suspect = duplicateSuspects?.[movie.id];
          const languageBlocked = !canImportMovie(movie.original_language);
          return (
            <div key={movie.id}>
              <button
                disabled={exists || isImporting || languageBlocked || (!!suspect && !exists)}
                onClick={() => !suspect && !languageBlocked && toggleSelect(movie.id)}
                className={`relative w-full bg-black rounded-xl overflow-hidden text-left transition-all ${
                  languageBlocked && !exists
                    ? 'opacity-50 cursor-default ring-1 ring-outline'
                    : suspect && !exists
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
                    {movie.original_language && (
                      <span className="ml-1.5 text-on-surface-muted">
                        ·{' '}
                        {LANGUAGE_OPTIONS.find((o) => o.value === movie.original_language)?.label ??
                          movie.original_language}
                      </span>
                    )}
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
                {languageBlocked && !exists && (
                  <div className="absolute top-2 right-2 bg-zinc-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Ban className="w-3 h-3" /> Not your language
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
