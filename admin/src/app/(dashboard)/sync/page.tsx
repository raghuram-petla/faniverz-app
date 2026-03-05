'use client';

import { Fragment, useState, useMemo, useCallback, useEffect } from 'react';
import { useAdminSyncLogs } from '@/hooks/useAdminSync';
import {
  useDiscoverMovies,
  useTmdbLookup,
  useImportMovies,
  useRefreshMovie,
  useRefreshActor,
  useStaleItems,
  useMovieSearch,
  useActorSearch,
} from '@/hooks/useSync';
import type { DiscoverResult, LookupResult, ImportMovieResult } from '@/hooks/useSync';
import { formatDateTime } from '@/lib/utils';
import {
  RefreshCw,
  Search,
  Film,
  Users,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = ['Discover', 'Import', 'Refresh', 'Bulk', 'History'] as const;
type Tab = (typeof TABS)[number];

const statusStyles: Record<string, { bg: string; text: string }> = {
  running: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  success: { bg: 'bg-green-600/20', text: 'text-green-400' },
  failed: { bg: 'bg-red-600/20', text: 'text-red-400' },
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR + 1 - i);
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'In progress...';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function SyncPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Discover');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Sync Command Center</h1>
          <p className="text-sm text-on-surface-muted">Import and refresh data from TMDB</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-surface-card border border-outline rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-red-600 text-white'
                : 'text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Discover' && <DiscoverTab />}
      {activeTab === 'Import' && <ImportTab />}
      {activeTab === 'Refresh' && <RefreshTab />}
      {activeTab === 'Bulk' && <BulkTab />}
      {activeTab === 'History' && <HistoryTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: DISCOVER
// ══════════════════════════════════════════════════════════════════════════════

function DiscoverTab() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(0); // 0 = all months
  const discover = useDiscoverMovies();
  const importMovies = useImportMovies();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState<
    Array<{
      tmdbId: number;
      title: string;
      status: 'pending' | 'importing' | 'done' | 'failed';
      result?: ImportMovieResult;
      error?: string;
    }>
  >([]);

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

  const selectAllNew = () => {
    setSelected(new Set(newMovies.map((m) => m.id)));
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    const moviesList = (data?.results ?? []).filter((m) => selected.has(m.id));
    const progress = moviesList.map((m) => ({
      tmdbId: m.id,
      title: m.title,
      status: 'pending' as const,
    }));
    setImportProgress(progress);

    // Import in batches of 5
    const ids = moviesList.map((m) => m.id);
    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);

      // Mark batch as importing
      setImportProgress((prev) =>
        prev.map((p) => (batch.includes(p.tmdbId) ? { ...p, status: 'importing' } : p)),
      );

      try {
        const response = await importMovies.mutateAsync(batch);

        // Mark results
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
      {/* Search Form */}
      <div className="bg-surface-card border border-outline rounded-xl p-5">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Discover Telugu Movies</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-on-surface-muted mb-1">Year</label>
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
          </div>
          <div>
            <label className="block text-xs text-on-surface-muted mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
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
            onClick={handleDiscover}
            disabled={discover.isPending}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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

      {discover.isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {discover.error instanceof Error ? discover.error.message : 'Discovery failed'}
        </div>
      )}

      {/* Results */}
      {data && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-on-surface-muted">
              Found <span className="text-on-surface font-medium">{data.results.length}</span>{' '}
              movies
              {' · '}
              <span className="text-green-400">{existingSet.size} imported</span>
              {' · '}
              <span className="text-blue-400">{newMovies.length} new</span>
            </p>
            <div className="flex items-center gap-2">
              {newMovies.length > 0 && (
                <button
                  onClick={selectAllNew}
                  className="text-xs text-on-surface-muted hover:text-on-surface transition-colors"
                >
                  Select all new ({newMovies.length})
                </button>
              )}
              {selected.size > 0 && (
                <button
                  onClick={handleImport}
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
            {data.results.map((movie) => {
              const isExisting = existingSet.has(movie.id);
              const isSelected = selected.has(movie.id);
              return (
                <button
                  key={movie.id}
                  onClick={() => !isExisting && toggleSelect(movie.id)}
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
                      <CheckCircle className="w-2.5 h-2.5" />
                      Imported
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
      )}

      {/* Import Progress */}
      {importProgress.length > 0 && (
        <div className="bg-surface-card border border-outline rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-on-surface">Import Progress</h3>
          {importProgress.map((p) => (
            <div key={p.tmdbId} className="flex items-center gap-3 text-sm">
              {p.status === 'pending' && (
                <div className="w-4 h-4 rounded-full border-2 border-on-surface-disabled" />
              )}
              {p.status === 'importing' && (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              )}
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
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: IMPORT
// ══════════════════════════════════════════════════════════════════════════════

function ImportTab() {
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

  const handleImport = async () => {
    if (!result) return;
    if (result.type === 'movie') {
      await importMovies.mutateAsync([result.data.tmdbId]);
      lookup.mutate({ tmdbId: result.data.tmdbId, type: 'movie' });
    }
  };

  const handleRefreshPerson = async () => {
    if (!result || result.type !== 'person' || !result.existingId) return;
    await refreshActor.mutateAsync(result.existingId);
    lookup.mutate({ tmdbId: result.data.tmdbPersonId, type: 'person' });
  };

  const isPending = importMovies.isPending || refreshActor.isPending;

  return (
    <div className="space-y-6">
      <div className="bg-surface-card border border-outline rounded-xl p-5">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Import by TMDB ID</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-on-surface-muted mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as 'movie' | 'person');
                lookup.reset();
              }}
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
              onChange={(e) => setTmdbId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="e.g. 823464"
              className="w-full bg-input rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={lookup.isPending || !tmdbId}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {lookup.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Lookup
          </button>
        </div>
      </div>

      {lookup.isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {lookup.error instanceof Error ? lookup.error.message : 'Lookup failed'}
        </div>
      )}

      {/* Movie Preview */}
      {result?.type === 'movie' && (
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
                  <span className="text-on-surface">{result.data.genres.join(', ') || '—'}</span>
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
                  onClick={handleImport}
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
      )}

      {/* Person Preview */}
      {result?.type === 'person' && (
        <div className="bg-surface-card border border-outline rounded-xl p-5">
          <div className="flex gap-5">
            {result.data.photoUrl ? (
              <img
                src={result.data.photoUrl}
                alt={result.data.name}
                className="w-24 h-32 object-cover rounded-lg shrink-0"
              />
            ) : (
              <div className="w-24 h-32 bg-surface-muted rounded-lg flex items-center justify-center shrink-0">
                <Users className="w-8 h-8 text-on-surface-disabled" />
              </div>
            )}
            <div className="space-y-2 min-w-0">
              <h3 className="text-lg font-semibold text-on-surface">{result.data.name}</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div>
                  <span className="text-on-surface-subtle">Birthday:</span>{' '}
                  <span className="text-on-surface">{result.data.birthday || '—'}</span>
                </div>
                <div>
                  <span className="text-on-surface-subtle">Born in:</span>{' '}
                  <span className="text-on-surface">{result.data.placeOfBirth || '—'}</span>
                </div>
              </div>
              {result.data.biography && (
                <p className="text-sm text-on-surface-muted line-clamp-3">
                  {result.data.biography}
                </p>
              )}
              <div className="flex items-center gap-3 pt-2">
                {result.existsInDb ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" /> In database
                    </span>
                    <button
                      onClick={handleRefreshPerson}
                      disabled={isPending}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Refresh from TMDB
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-on-surface-subtle">
                    <AlertCircle className="w-4 h-4" /> Not in database — import via movie import
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {importMovies.isSuccess && (
        <div className="bg-green-600/10 border border-green-600/30 rounded-lg px-4 py-3 text-green-400 text-sm">
          Import completed successfully.
        </div>
      )}
      {refreshActor.isSuccess && (
        <div className="bg-green-600/10 border border-green-600/30 rounded-lg px-4 py-3 text-green-400 text-sm">
          Actor refreshed successfully. Updated fields:{' '}
          {refreshActor.data?.result.fields.join(', ') || 'none'}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: REFRESH
// ══════════════════════════════════════════════════════════════════════════════

function RefreshTab() {
  return (
    <div className="space-y-6">
      <RefreshMovieSection />
      <RefreshActorSection />
    </div>
  );
}

function RefreshMovieSection() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const { data: searchResults } = useMovieSearch(debouncedQuery);
  const refreshMovie = useRefreshMovie();

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const selectedMovie = searchResults?.find((m) => m.id === selectedMovieId);

  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Film className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-on-surface">Refresh Movie</h2>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setSelectedMovieId(null);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search movie by title..."
            className="w-full bg-input rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        {showDropdown && searchResults && searchResults.length > 0 && !selectedMovieId && (
          <div className="absolute z-10 mt-1 w-full bg-surface-card border border-outline rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((movie) => (
              <button
                key={movie.id}
                onClick={() => {
                  setSelectedMovieId(movie.id);
                  setQuery(movie.title);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-surface-elevated transition-colors border-b border-outline-subtle last:border-0"
              >
                <span className="text-sm text-on-surface font-medium">{movie.title}</span>
                <span className="text-xs text-on-surface-subtle ml-2">{movie.release_date}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedMovie && (
        <div className="mt-4 p-4 bg-surface-elevated rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-on-surface font-medium">{selectedMovie.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-on-surface-subtle">
                  Released: {selectedMovie.release_date}
                </span>
                {selectedMovie.tmdb_id && (
                  <span className="text-xs text-on-surface-subtle">
                    TMDB: {selectedMovie.tmdb_id}
                  </span>
                )}
                {selectedMovie.tmdb_last_synced_at ? (
                  <span className="text-xs text-on-surface-subtle flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Synced {formatRelativeTime(selectedMovie.tmdb_last_synced_at)}
                  </span>
                ) : (
                  <span className="text-xs text-yellow-400">Never synced</span>
                )}
              </div>
            </div>
            <button
              onClick={() => refreshMovie.mutate(selectedMovie.id)}
              disabled={refreshMovie.isPending || !selectedMovie.tmdb_id}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {refreshMovie.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Refresh from TMDB
            </button>
          </div>
          {!selectedMovie.tmdb_id && (
            <p className="text-xs text-yellow-400 mt-2">
              This movie has no TMDB ID and cannot be refreshed.
            </p>
          )}
          {refreshMovie.isSuccess && (
            <p className="text-xs text-green-400 mt-2">
              Refreshed — {refreshMovie.data.result.castCount} cast,{' '}
              {refreshMovie.data.result.crewCount} crew
            </p>
          )}
          {refreshMovie.isError && (
            <p className="text-xs text-red-400 mt-2">
              {refreshMovie.error instanceof Error ? refreshMovie.error.message : 'Refresh failed'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RefreshActorSection() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const { data: searchResults } = useActorSearch(debouncedQuery);
  const refreshActor = useRefreshActor();

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const selectedActor = searchResults?.find((a) => a.id === selectedActorId);

  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-green-400" />
        <h2 className="text-lg font-semibold text-on-surface">Refresh Actor</h2>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setSelectedActorId(null);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search actor by name..."
            className="w-full bg-input rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        {showDropdown && searchResults && searchResults.length > 0 && !selectedActorId && (
          <div className="absolute z-10 mt-1 w-full bg-surface-card border border-outline rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((actor) => (
              <button
                key={actor.id}
                onClick={() => {
                  setSelectedActorId(actor.id);
                  setQuery(actor.name);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-surface-elevated transition-colors border-b border-outline-subtle last:border-0"
              >
                <span className="text-sm text-on-surface font-medium">{actor.name}</span>
                {actor.tmdb_person_id && (
                  <span className="text-xs text-on-surface-subtle ml-2">
                    TMDB: {actor.tmdb_person_id}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedActor && (
        <div className="mt-4 p-4 bg-surface-elevated rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-on-surface font-medium">{selectedActor.name}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span
                  className={`text-xs ${selectedActor.biography ? 'text-green-400' : 'text-yellow-400'}`}
                >
                  Bio: {selectedActor.biography ? '✓' : '✗'}
                </span>
                <span
                  className={`text-xs ${selectedActor.photo_url ? 'text-green-400' : 'text-yellow-400'}`}
                >
                  Photo: {selectedActor.photo_url ? '✓' : '✗'}
                </span>
                <span
                  className={`text-xs ${selectedActor.birth_date ? 'text-green-400' : 'text-yellow-400'}`}
                >
                  DOB: {selectedActor.birth_date ? '✓' : '✗'}
                </span>
              </div>
            </div>
            <button
              onClick={() => refreshActor.mutate(selectedActor.id)}
              disabled={refreshActor.isPending || !selectedActor.tmdb_person_id}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {refreshActor.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Refresh from TMDB
            </button>
          </div>
          {!selectedActor.tmdb_person_id && (
            <p className="text-xs text-yellow-400 mt-2">No TMDB person ID. Cannot refresh.</p>
          )}
          {refreshActor.isSuccess && (
            <p className="text-xs text-green-400 mt-2">
              Refreshed. Updated: {refreshActor.data?.result.fields.join(', ') || 'no changes'}
            </p>
          )}
          {refreshActor.isError && (
            <p className="text-xs text-red-400 mt-2">
              {refreshActor.error instanceof Error ? refreshActor.error.message : 'Refresh failed'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4: BULK
// ══════════════════════════════════════════════════════════════════════════════

function BulkTab() {
  const [staleDays, setStaleDays] = useState(30);
  const staleMovies = useStaleItems('movies', staleDays);
  const missingBios = useStaleItems('actors-missing-bios');
  const refreshMovie = useRefreshMovie();
  const refreshActor = useRefreshActor();
  const [showStaleList, setShowStaleList] = useState(false);
  const [showBioList, setShowBioList] = useState(false);

  const [bulkProgress, setBulkProgress] = useState<{
    type: 'movies' | 'actors';
    total: number;
    completed: number;
    current: string;
    errors: string[];
  } | null>(null);

  const handleBulkRefreshMovies = async () => {
    const items = staleMovies.data?.items ?? [];
    if (items.length === 0) return;
    if (!confirm(`Refresh ${items.length} stale movies from TMDB? This may take a while.`)) return;

    setBulkProgress({ type: 'movies', total: items.length, completed: 0, current: '', errors: [] });

    for (const item of items) {
      setBulkProgress((prev) => (prev ? { ...prev, current: item.title ?? 'Unknown' } : prev));
      try {
        await refreshMovie.mutateAsync(item.id);
      } catch (err) {
        setBulkProgress((prev) =>
          prev
            ? {
                ...prev,
                errors: [
                  ...prev.errors,
                  `${item.title}: ${err instanceof Error ? err.message : 'Failed'}`,
                ],
              }
            : prev,
        );
      }
      setBulkProgress((prev) => (prev ? { ...prev, completed: prev.completed + 1 } : prev));
    }
  };

  const handleBulkRefreshActors = async () => {
    const items = missingBios.data?.items ?? [];
    if (items.length === 0) return;
    if (!confirm(`Fetch bios for ${items.length} actors from TMDB? This may take a while.`)) return;

    setBulkProgress({
      type: 'actors',
      total: items.length,
      completed: 0,
      current: '',
      errors: [],
    });

    for (const item of items) {
      setBulkProgress((prev) => (prev ? { ...prev, current: item.name ?? 'Unknown' } : prev));
      try {
        await refreshActor.mutateAsync(item.id);
      } catch (err) {
        setBulkProgress((prev) =>
          prev
            ? {
                ...prev,
                errors: [
                  ...prev.errors,
                  `${item.name}: ${err instanceof Error ? err.message : 'Failed'}`,
                ],
              }
            : prev,
        );
      }
      setBulkProgress((prev) => (prev ? { ...prev, completed: prev.completed + 1 } : prev));
    }
  };

  const isBulkRunning = bulkProgress !== null && bulkProgress.completed < bulkProgress.total;

  return (
    <div className="space-y-6">
      {/* Stale Movies */}
      <div className="bg-surface-card border border-outline rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-on-surface">Stale Movies</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-on-surface-muted">Not synced in</span>
            <select
              value={staleDays}
              onChange={(e) => setStaleDays(Number(e.target.value))}
              className="bg-input rounded-lg px-2 py-1 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        {staleMovies.isLoading ? (
          <div className="flex items-center gap-2 text-on-surface-subtle text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-on-surface-muted">
              Found{' '}
              <span className="text-on-surface font-medium">
                {staleMovies.data?.items.length ?? 0}
              </span>{' '}
              movies
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStaleList((v) => !v)}
                disabled={(staleMovies.data?.items.length ?? 0) === 0}
                className="flex items-center gap-1.5 text-sm text-on-surface-muted hover:text-on-surface transition-colors disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                {showStaleList ? 'Hide' : 'Preview'}
              </button>
              <button
                onClick={handleBulkRefreshMovies}
                disabled={isBulkRunning || (staleMovies.data?.items.length ?? 0) === 0}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh All
              </button>
            </div>
          </div>
        )}

        {showStaleList && staleMovies.data && (
          <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
            {staleMovies.data.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs py-1 border-b border-outline-subtle"
              >
                <span className="text-on-surface">{item.title}</span>
                <span className="text-on-surface-subtle">
                  {item.tmdb_last_synced_at
                    ? formatRelativeTime(item.tmdb_last_synced_at)
                    : 'Never'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missing Actor Bios */}
      <div className="bg-surface-card border border-outline rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-on-surface">Missing Actor Bios</h2>
        </div>

        {missingBios.isLoading ? (
          <div className="flex items-center gap-2 text-on-surface-subtle text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-on-surface-muted">
              <span className="text-on-surface font-medium">
                {missingBios.data?.items.length ?? 0}
              </span>{' '}
              actors with TMDB ID but no biography
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBioList((v) => !v)}
                disabled={(missingBios.data?.items.length ?? 0) === 0}
                className="flex items-center gap-1.5 text-sm text-on-surface-muted hover:text-on-surface transition-colors disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                {showBioList ? 'Hide' : 'Preview'}
              </button>
              <button
                onClick={handleBulkRefreshActors}
                disabled={isBulkRunning || (missingBios.data?.items.length ?? 0) === 0}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Fetch All Bios
              </button>
            </div>
          </div>
        )}

        {showBioList && missingBios.data && (
          <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
            {missingBios.data.items.map((item) => (
              <div
                key={item.id}
                className="text-xs py-1 border-b border-outline-subtle text-on-surface"
              >
                {item.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Progress */}
      {bulkProgress && (
        <div className="bg-surface-card border border-outline rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-on-surface">
            {bulkProgress.type === 'movies' ? 'Refreshing Movies' : 'Fetching Actor Bios'}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all"
                style={{
                  width: `${(bulkProgress.completed / bulkProgress.total) * 100}%`,
                }}
              />
            </div>
            <span className="text-sm text-on-surface-muted whitespace-nowrap">
              {bulkProgress.completed}/{bulkProgress.total}
            </span>
          </div>
          {bulkProgress.current && bulkProgress.completed < bulkProgress.total && (
            <p className="text-xs text-on-surface-subtle flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              {bulkProgress.current}
            </p>
          )}
          {bulkProgress.completed === bulkProgress.total && (
            <p className="text-xs text-green-400">
              Complete! {bulkProgress.errors.length > 0 && `${bulkProgress.errors.length} errors.`}
            </p>
          )}
          {bulkProgress.errors.length > 0 && (
            <div className="text-xs text-red-400 space-y-0.5 max-h-20 overflow-y-auto">
              {bulkProgress.errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5: HISTORY
// ══════════════════════════════════════════════════════════════════════════════

function HistoryTab() {
  const { data: logs, isLoading } = useAdminSyncLogs();
  const [statusFilter, setStatusFilter] = useState('');
  const [functionFilter, setFunctionFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const hasRunning = logs?.some((l) => l.status === 'running');

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      if (statusFilter && log.status !== statusFilter) return false;
      if (functionFilter && log.function_name !== functionFilter) return false;
      return true;
    });
  }, [logs, statusFilter, functionFilter]);

  const functionNames = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map((l) => l.function_name))].sort();
  }, [logs]);

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="">All Statuses</option>
          <option value="running">Running</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={functionFilter}
          onChange={(e) => setFunctionFilter(e.target.value)}
          className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="">All Functions</option>
          {functionNames.map((fn) => (
            <option key={fn} value={fn}>
              {fn}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        {hasRunning && (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Auto-refreshing
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-20 text-on-surface-subtle">No sync logs found.</div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="w-10 px-3 py-4" />
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Function
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Status
                </th>
                <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                  Added
                </th>
                <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                  Updated
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Started
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const status = statusStyles[log.status] ?? statusStyles.failed;
                const isExpanded = expandedRows.has(log.id);
                const hasErrors =
                  log.errors &&
                  typeof log.errors === 'object' &&
                  (Array.isArray(log.errors)
                    ? log.errors.length > 0
                    : Object.keys(log.errors).length > 0);

                return (
                  <Fragment key={log.id}>
                    <tr
                      className={`border-b border-outline-subtle hover:bg-surface-elevated transition-colors ${hasErrors ? 'cursor-pointer' : ''}`}
                      onClick={() => hasErrors && toggleRow(log.id)}
                    >
                      <td className="px-3 py-4 text-on-surface-disabled">
                        {hasErrors &&
                          (isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          ))}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-on-surface font-medium font-mono text-sm">
                          {log.function_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
                        >
                          {log.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-on-surface-muted text-sm">
                        {log.movies_added}
                      </td>
                      <td className="px-6 py-4 text-right text-on-surface-muted text-sm">
                        {log.movies_updated}
                      </td>
                      <td className="px-6 py-4 text-on-surface-muted text-sm">
                        {formatDateTime(log.started_at)}
                      </td>
                      <td className="px-6 py-4 text-on-surface-muted text-sm">
                        {formatDuration(log.started_at, log.completed_at)}
                      </td>
                    </tr>
                    {isExpanded && hasErrors && (
                      <tr className="border-b border-outline-subtle">
                        <td colSpan={7} className="px-6 py-4 bg-surface">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-on-surface-subtle uppercase tracking-wider">
                              Error Details
                            </p>
                            <pre className="text-sm text-on-surface-muted bg-surface-elevated rounded-lg p-4 overflow-x-auto max-h-60 font-mono">
                              {JSON.stringify(log.errors, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
