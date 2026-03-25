'use client';

import { useState } from 'react';
import {
  useDiscoverMovies,
  useTmdbSearch,
  useTmdbLookup,
  useImportMovies,
  useImportActor,
  useRefreshActor,
} from '@/hooks/useSync';
import type { LookupResult, TmdbSearchAllResult, DiscoverResult } from '@/hooks/useSync';
import { Search, Globe, Loader2 } from 'lucide-react';
import { CURRENT_YEAR, YEARS, MONTHS } from './syncHelpers';
import { SearchResultsPanel } from './SearchResultsPanel';
import { DiscoverByYear } from './DiscoverByYear';
import { MonthMultiSelect } from './MonthMultiSelect';
import { MoviePreview } from './MoviePreview';
import { PersonPreview } from './PersonPreview';
import { useLanguageContext } from '@/hooks/useLanguageContext';

type ResultMode = 'search' | 'discover' | 'lookup';

export interface DiscoverTabProps {
  /** @contract: notifies parent when import starts/stops so tab switching can be blocked */
  onImportingChange?: (importing: boolean) => void;
}

/** @contract Unified TMDB sync — search bar + discover by year, one results area */
export function DiscoverTab({ onImportingChange }: DiscoverTabProps) {
  const { selectedLanguageCode } = useLanguageContext();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [months, setMonths] = useState<number[]>([]);
  const [resultMode, setResultMode] = useState<ResultMode | null>(null);
  /** @edge stores the label shown above results — set at trigger time, not from live input */
  const [resultLabel, setResultLabel] = useState('');

  const search = useTmdbSearch();
  const discover = useDiscoverMovies();
  const lookup = useTmdbLookup();
  const importMovies = useImportMovies();
  const importActor = useImportActor();
  const refreshActor = useRefreshActor();

  const isNumeric = /^\d+$/.test(query.trim());
  const isPending = search.isPending || lookup.isPending;

  const handleSearch = () => {
    if (!query.trim() || query.trim().length < 2) return;
    if (isNumeric) {
      lookup.mutate({ tmdbId: parseInt(query.trim(), 10), type: 'movie' });
      setResultMode('lookup');
      setResultLabel(`TMDB ID: ${query.trim()}`);
    } else {
      search.mutate({ query: query.trim(), language: selectedLanguageCode || undefined });
      setResultMode('search');
      setResultLabel(query.trim());
    }
  };

  const handleDiscover = () => {
    const label =
      months.length === 0
        ? `${year}`
        : months.length <= 3
          ? months.map((m) => MONTHS[m - 1]).join(', ') + ` ${year}`
          : `${months.length} months in ${year}`;
    setResultLabel(label);
    discover.mutate({
      year,
      months: months.length > 0 ? months : undefined,
      language: selectedLanguageCode || undefined,
    });
    setResultMode('discover');
  };

  /** @sideeffect imports movie from TMDB ID lookup — no re-lookup to avoid flash */
  const handleLookupImport = async () => {
    const result = lookup.data as LookupResult | undefined;
    if (!result || result.type !== 'movie') return;
    await importMovies.mutateAsync({
      tmdbIds: [result.data.tmdbId],
      originalLanguage: result.data.originalLanguage,
    });
  };

  const handleRefreshPerson = async () => {
    const result = lookup.data as LookupResult | undefined;
    if (!result || result.type !== 'person' || !result.existingId) return;
    await refreshActor.mutateAsync(result.existingId);
  };

  /** @sideeffect imports actor from TMDB — no re-lookup to avoid flash */
  const handleImportPerson = async () => {
    const result = lookup.data as LookupResult | undefined;
    if (!result || result.type !== 'person') return;
    await importActor.mutateAsync(result.data.tmdbPersonId);
  };

  const lookupResult = lookup.data as LookupResult | undefined;
  const searchData = search.data as TmdbSearchAllResult | undefined;
  const discoverData = discover.data as DiscoverResult | undefined;

  return (
    <div className="space-y-6">
      {/* ── Search OR Discover ── */}
      <div className="max-w-2xl mx-auto bg-surface-card border border-outline rounded-xl p-5 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search movies, actors, or TMDB ID..."
              className="w-full bg-input rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isPending || query.trim().length < 2}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isNumeric ? 'Lookup' : 'Search'}
          </button>
        </div>

        {/* OR divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-outline" />
          <span className="text-xs font-medium text-on-surface-muted uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-outline" />
        </div>

        {/* Discover by year */}
        <div className="flex items-center justify-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <MonthMultiSelect selected={months} onChange={setMonths} />
          <button
            onClick={handleDiscover}
            disabled={discover.isPending}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
          >
            {discover.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            Discover
          </button>
        </div>
      </div>

      {/* ── Error display ── */}
      {(search.isError || lookup.isError || discover.isError) && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-status-red text-sm">
          {(search.error ?? lookup.error ?? discover.error) instanceof Error
            ? (search.error ?? lookup.error ?? discover.error)?.message
            : 'Operation failed'}
        </div>
      )}

      {/* ── Results area ── */}
      {resultMode && resultLabel && (
        <p className="text-sm text-on-surface-muted">
          Results for{' '}
          <span className="text-on-surface font-medium">&ldquo;{resultLabel}&rdquo;</span>
        </p>
      )}

      {resultMode === 'search' && searchData && <SearchResultsPanel data={searchData} />}

      {resultMode === 'discover' && discoverData && (
        <DiscoverByYear data={discoverData} onImportingChange={onImportingChange} />
      )}

      {resultMode === 'lookup' && lookupResult?.type === 'movie' && (
        <>
          <MoviePreview
            result={importMovies.isSuccess ? { ...lookupResult, existsInDb: true } : lookupResult}
            isPending={importMovies.isPending}
            onImport={handleLookupImport}
          />
          {importMovies.isSuccess && (
            <div className="bg-green-600/10 border border-green-600/30 rounded-lg px-4 py-3 text-status-green text-sm">
              Import completed successfully.
            </div>
          )}
        </>
      )}

      {resultMode === 'lookup' && lookupResult?.type === 'person' && (
        <>
          <PersonPreview
            result={importActor.isSuccess ? { ...lookupResult, existsInDb: true } : lookupResult}
            isPending={refreshActor.isPending || importActor.isPending}
            onRefresh={handleRefreshPerson}
            onImport={handleImportPerson}
          />
          {importActor.isSuccess && (
            <div className="bg-green-600/10 border border-green-600/30 rounded-lg px-4 py-3 text-status-green text-sm">
              Actor imported: {importActor.data?.result?.name}
            </div>
          )}
          {refreshActor.isSuccess && (
            <div className="bg-green-600/10 border border-green-600/30 rounded-lg px-4 py-3 text-status-green text-sm">
              Actor refreshed. Updated: {refreshActor.data?.result?.fields?.join(', ') || 'none'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
