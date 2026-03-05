'use client';

import { useState, useMemo } from 'react';
import { useDiscoverMovies, useImportMovies } from '@/hooks/useSync';
import type { DiscoverResult } from '@/hooks/useSync';
import { Film, Globe, Loader2, Download, CheckCircle, XCircle } from 'lucide-react';
import { CURRENT_YEAR, YEARS, MONTHS, type ImportProgress } from './syncHelpers';

export function DiscoverTab() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(0);
  const discover = useDiscoverMovies();
  const importMovies = useImportMovies();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);

  const data = discover.data as DiscoverResult | undefined;
  const existingSet = useMemo(() => new Set(data?.existingTmdbIds ?? []), [data?.existingTmdbIds]);
  const newMovies = useMemo(
    () => (data?.results ?? []).filter((m) => !existingSet.has(m.id)),
    [data?.results, existingSet],
  );

  const handleDiscover = () => {
    setSelected(new Set());
    setImportProgress([]);
    discover.mutate({ year, month: month || undefined });
  };

  const toggleSelect = (tmdbId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tmdbId)) next.delete(tmdbId);
      else next.add(tmdbId);
      return next;
    });
  };

  const selectAllNew = () => setSelected(new Set(newMovies.map((m) => m.id)));

  const handleImport = async () => {
    if (selected.size === 0) return;
    const moviesList = (data?.results ?? []).filter((m) => selected.has(m.id));
    const progress = moviesList.map((m) => ({
      tmdbId: m.id,
      title: m.title,
      status: 'pending' as const,
    }));
    setImportProgress(progress);

    const ids = moviesList.map((m) => m.id);
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

  return (
    <div className="space-y-6">
      <DiscoverForm
        year={year}
        month={month}
        isPending={discover.isPending}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onDiscover={handleDiscover}
      />

      {discover.isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {discover.error instanceof Error ? discover.error.message : 'Discovery failed'}
        </div>
      )}

      {data && (
        <DiscoverResults
          results={data.results}
          existingSet={existingSet}
          newMovies={newMovies}
          selected={selected}
          isImporting={isImporting}
          onToggleSelect={toggleSelect}
          onSelectAllNew={selectAllNew}
          onImport={handleImport}
        />
      )}

      {importProgress.length > 0 && <ImportProgressList items={importProgress} />}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

export interface DiscoverFormProps {
  year: number;
  month: number;
  isPending: boolean;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onDiscover: () => void;
}

function DiscoverForm({
  year,
  month,
  isPending,
  onYearChange,
  onMonthChange,
  onDiscover,
}: DiscoverFormProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5">
      <h2 className="text-lg font-semibold text-on-surface mb-4">Discover Telugu Movies</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-on-surface-muted mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-on-surface-muted mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value={0}>All months</option>
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onDiscover}
          disabled={isPending}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          Discover
        </button>
      </div>
    </div>
  );
}

interface DiscoverMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
}

export interface DiscoverResultsProps {
  results: DiscoverMovie[];
  existingSet: Set<number>;
  newMovies: DiscoverMovie[];
  selected: Set<number>;
  isImporting: boolean;
  onToggleSelect: (tmdbId: number) => void;
  onSelectAllNew: () => void;
  onImport: () => void;
}

function DiscoverResults({
  results,
  existingSet,
  newMovies,
  selected,
  isImporting,
  onToggleSelect,
  onSelectAllNew,
  onImport,
}: DiscoverResultsProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-muted">
          Found <span className="text-on-surface font-medium">{results.length}</span> movies
          {' · '}
          <span className="text-green-400">{existingSet.size} imported</span>
          {' · '}
          <span className="text-blue-400">{newMovies.length} new</span>
        </p>
        <div className="flex items-center gap-2">
          {newMovies.length > 0 && (
            <button
              onClick={onSelectAllNew}
              className="text-xs text-on-surface-muted hover:text-on-surface transition-colors"
            >
              Select all new ({newMovies.length})
            </button>
          )}
          {selected.size > 0 && (
            <button
              onClick={onImport}
              disabled={isImporting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {results.map((movie) => {
          const isExisting = existingSet.has(movie.id);
          const isSelected = selected.has(movie.id);
          return (
            <button
              key={movie.id}
              onClick={() => !isExisting && onToggleSelect(movie.id)}
              disabled={isExisting || isImporting}
              className={`relative bg-surface-card border rounded-xl overflow-hidden text-left transition-all ${
                isSelected
                  ? 'border-red-600 ring-1 ring-red-600'
                  : isExisting
                    ? 'border-outline opacity-60'
                    : 'border-outline hover:border-on-surface-subtle'
              } disabled:cursor-default`}
            >
              <div className="aspect-[2/3] bg-surface-muted">
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-8 h-8 text-on-surface-disabled" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-medium text-on-surface line-clamp-2 leading-tight">
                  {movie.title}
                </p>
                <p className="text-xs text-on-surface-subtle mt-1">
                  {movie.release_date || 'No date'}
                </p>
              </div>
              {isExisting && (
                <div className="absolute top-2 right-2 bg-green-600/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle className="w-2.5 h-2.5" /> Imported
                </div>
              )}
              {isSelected && !isExisting && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

export interface ImportProgressListProps {
  items: ImportProgress[];
}

function ImportProgressList({ items }: ImportProgressListProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-on-surface">Import Progress</h3>
      {items.map((p) => (
        <div key={p.tmdbId} className="flex items-center gap-3 text-sm">
          {p.status === 'pending' && (
            <div className="w-4 h-4 rounded-full border-2 border-on-surface-disabled" />
          )}
          {p.status === 'importing' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
          {p.status === 'done' && <CheckCircle className="w-4 h-4 text-green-400" />}
          {p.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
          <span
            className={
              p.status === 'done'
                ? 'text-on-surface'
                : p.status === 'failed'
                  ? 'text-red-400'
                  : 'text-on-surface-muted'
            }
          >
            {p.title}
          </span>
          {p.result && (
            <span className="text-xs text-on-surface-subtle">
              ({p.result.castCount} cast, {p.result.crewCount} crew)
            </span>
          )}
          {p.error && <span className="text-xs text-red-400">{p.error}</span>}
        </div>
      ))}
    </div>
  );
}
