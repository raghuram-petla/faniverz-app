'use client';

import { useState, useMemo } from 'react';
import { useDiscoverMovies, useImportMovies } from '@/hooks/useSync';
import type { DiscoverResult } from '@/hooks/useSync';
import { Globe, Loader2 } from 'lucide-react';
import { CURRENT_YEAR, YEARS, MONTHS, type ImportProgress } from './syncHelpers';
import { DiscoverResults, ImportProgressList } from './DiscoverResults';

/** @contract discovers Telugu movies from TMDB by year/month and supports batch import */
export function DiscoverTab() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(0);
  const discover = useDiscoverMovies();
  const importMovies = useImportMovies();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);

  /** @boundary DiscoverResult shape returned by useDiscoverMovies — cast needed due to mutation generic */
  const data = discover.data as DiscoverResult | undefined;
  /** @invariant existingSet rebuilt only when existingTmdbIds changes — used to mark imported movies */
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

  /**
   * @sideeffect imports selected movies in batches of 5 via /api/sync/import
   * @edge batch size of 5 prevents TMDB rate-limit hits; errors per-batch are captured individually
   */
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
      <h2 className="text-lg font-semibold text-on-surface mb-4">Discover Movies</h2>
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
