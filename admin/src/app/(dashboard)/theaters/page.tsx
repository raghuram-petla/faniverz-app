'use client';
import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import {
  useTheaterMovies,
  useUpcomingMovies,
  useTheaterSearch,
  useAddToTheaters,
  useRemoveFromTheaters,
} from '@/hooks/useTheaterMovies';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { Loader2, Check } from 'lucide-react';
import { MovieListItem } from '@/components/theaters/MovieListItem';
import { ManualAddPanel } from '@/components/theaters/ManualAddPanel';
import { PendingChangesSection } from '@/components/theaters/PendingChangesSection';

// @contract Pending change: toggle direction + date + movie title for display + optional label
interface PendingChange {
  inTheaters: boolean;
  date: string;
  title: string;
  posterUrl: string | null;
  label?: string | null;
}

function daysUntil(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff <= 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`;
}

export default function TheatersPage() {
  const { data: theaterMovies, isLoading } = useTheaterMovies();
  const { data: upcomingMovies, isLoading: upcomingLoading } = useUpcomingMovies();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const { data: searchResults, isFetching: isSearching } = useTheaterSearch(debouncedSearch);
  const addToTheaters = useAddToTheaters();
  const removeFromTheaters = useRemoveFromTheaters();
  const today = new Date().toISOString().split('T')[0];

  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  // @sideeffect Snapshot anchor position before state change, compensate after DOM update
  const anchorRef = useRef<HTMLDivElement>(null);
  const savedTopRef = useRef<number | null>(null);
  const snapshotScroll = useCallback(() => {
    savedTopRef.current = anchorRef.current?.getBoundingClientRect().top ?? null;
  }, []);
  useLayoutEffect(() => {
    if (savedTopRef.current === null) return;
    const newTop = anchorRef.current?.getBoundingClientRect().top ?? 0;
    window.scrollBy(0, newTop - savedTopRef.current);
    savedTopRef.current = null;
  }, [pendingChanges]);

  const movies = theaterMovies ?? [];
  const upcoming = upcomingMovies ?? [];
  const results = searchResults ?? [];
  const changeCount = pendingChanges.size;
  const isDirty = changeCount > 0;

  const handleToggle = useCallback(
    (
      movieId: string,
      title: string,
      posterUrl: string | null,
      inTheaters: boolean,
      defaultDate: string,
    ) => {
      snapshotScroll();
      setPendingChanges((prev) => {
        const next = new Map(prev);
        next.set(movieId, { inTheaters, date: defaultDate, title, posterUrl });
        return next;
      });
    },
    [snapshotScroll],
  );

  const updatePendingDate = useCallback((movieId: string, date: string) => {
    setPendingChanges((prev) => {
      const existing = prev.get(movieId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(movieId, { ...existing, date });
      return next;
    });
  }, []);

  const removePendingChange = useCallback(
    (movieId: string) => {
      snapshotScroll();
      setPendingChanges((prev) => {
        const next = new Map(prev);
        next.delete(movieId);
        return next;
      });
    },
    [snapshotScroll],
  );

  // @sideeffect Commits all pending changes
  async function handleSave() {
    setSaveStatus('saving');
    const entries = Array.from(pendingChanges.entries());
    const additions = entries.filter(([, c]) => c.inTheaters);
    const removals = entries.filter(([, c]) => !c.inTheaters);

    try {
      await Promise.all([
        ...additions.map(([movieId, c]) =>
          addToTheaters.mutateAsync({ movieId, startDate: c.date, label: c.label ?? null }),
        ),
        ...removals.map(([movieId]) => removeFromTheaters.mutateAsync({ movieId })),
      ]);
      setPendingChanges(new Map());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('idle');
    }
  }

  const handleDiscard = () => {
    snapshotScroll();
    setPendingChanges(new Map());
  };

  const isEffectivelyOn = useCallback(
    (movieId: string, serverValue: boolean): boolean =>
      pendingChanges.has(movieId) ? pendingChanges.get(movieId)!.inTheaters : serverValue,
    [pendingChanges],
  );

  const getPendingDate = useCallback(
    (movieId: string): string | undefined => pendingChanges.get(movieId)?.date,
    [pendingChanges],
  );

  function handleManualAdd(
    movieId: string,
    title: string,
    posterUrl: string | null,
    startDate: string,
    label: string | null,
  ) {
    snapshotScroll();
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(movieId, { inTheaters: true, date: startDate, title, posterUrl, label });
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header with Save/Discard */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-on-surface">In Theaters</h1>
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full font-medium">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {isDirty && saveStatus !== 'success' && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-medium">
              {changeCount} unsaved change{changeCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              onClick={handleDiscard}
              disabled={saveStatus === 'saving'}
              className="px-4 py-2 text-sm font-medium text-on-surface-muted hover:text-on-surface rounded-lg hover:bg-surface-elevated transition-colors disabled:opacity-50"
            >
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saveStatus === 'saving'}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
              isDirty && saveStatus !== 'saving'
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25'
                : 'bg-surface-elevated text-on-surface-disabled cursor-not-allowed'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Pending Changes — staging area */}
      <PendingChangesSection
        changes={Array.from(pendingChanges.entries()).map(([movieId, c]) => ({
          movieId,
          title: c.title,
          posterUrl: c.posterUrl,
          inTheaters: c.inTheaters,
          date: c.date,
          label: c.label,
        }))}
        onDateChange={updatePendingDate}
        onRemove={removePendingChange}
        today={today}
      />

      {/* Scroll anchor — tracks position to compensate layout shifts */}
      <div ref={anchorRef} />

      {/* Add a Movie */}
      <ManualAddPanel
        search={search}
        setSearch={setSearch}
        debouncedSearch={debouncedSearch}
        isSearching={isSearching}
        results={results}
        onAdd={handleManualAdd}
        isAdding={addToTheaters.isPending}
      />

      {/* Two columns — In Theaters | Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* In Theaters */}
        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-3">
            In Theaters
            {!isLoading && (
              <span className="ml-2 text-sm font-normal text-on-surface-muted">
                ({movies.length})
              </span>
            )}
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : movies.length === 0 ? (
            <div className="bg-surface-card border border-outline rounded-xl p-8 text-center text-on-surface-subtle text-sm">
              No movies currently in theaters
            </div>
          ) : (
            <div className="bg-surface-card border border-outline rounded-xl p-1.5 space-y-0.5 ">
              {movies.map((movie) => (
                <MovieListItem
                  key={movie.id}
                  id={movie.id}
                  title={movie.title}
                  posterUrl={movie.poster_url}
                  releaseDate={movie.release_date}
                  isOn={isEffectivelyOn(movie.id, true)}
                  pendingDate={getPendingDate(movie.id)}
                  onToggle={(d) => handleToggle(movie.id, movie.title, movie.poster_url, false, d)}
                  onRevert={() => removePendingChange(movie.id)}
                  onDateChange={(d) => updatePendingDate(movie.id, d)}
                  dateLabel="End date"
                  maxDate={today}
                />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming */}
        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-3">
            Upcoming
            {!upcomingLoading && (
              <span className="ml-2 text-sm font-normal text-on-surface-muted">
                ({upcoming.length})
              </span>
            )}
          </h2>
          {upcomingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="bg-surface-card border border-outline rounded-xl p-8 text-center text-on-surface-subtle text-sm">
              No upcoming releases
            </div>
          ) : (
            <div className="bg-surface-card border border-outline rounded-xl p-1.5 space-y-0.5 ">
              {upcoming.map((movie) => (
                <MovieListItem
                  key={movie.id}
                  id={movie.id}
                  title={movie.title}
                  posterUrl={movie.poster_url}
                  releaseDate={movie.release_date}
                  isOn={isEffectivelyOn(movie.id, false)}
                  pendingDate={getPendingDate(movie.id)}
                  onToggle={(d) => handleToggle(movie.id, movie.title, movie.poster_url, true, d)}
                  onRevert={() => removePendingChange(movie.id)}
                  onDateChange={(d) => updatePendingDate(movie.id, d)}
                  dateLabel="Start date"
                  minDate={today}
                  subtitle={movie.release_date ? daysUntil(movie.release_date) : undefined}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
