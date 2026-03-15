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
import { MovieColumn } from '@/components/theaters/MovieColumn';
import { ManualAddPanel } from '@/components/theaters/ManualAddPanel';
import { PendingChangesSection } from '@/components/theaters/PendingChangesSection';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

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
  const scrollToTopRef = useRef(false);
  const snapshotScroll = useCallback(() => {
    savedTopRef.current = anchorRef.current?.getBoundingClientRect().top ?? null;
  }, []);
  useLayoutEffect(() => {
    if (scrollToTopRef.current) {
      window.scrollTo(0, 0);
      scrollToTopRef.current = false;
      savedTopRef.current = null;
      return;
    }
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

  useUnsavedChangesWarning(isDirty);

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
        ...removals.map(([movieId, c]) =>
          removeFromTheaters.mutateAsync({ movieId, endDate: c.date }),
        ),
      ]);
      setPendingChanges(new Map());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('idle');
    }
  }

  // @sideeffect Clears all pending changes and scrolls to top before paint via layoutEffect
  const handleDiscard = () => {
    scrollToTopRef.current = true;
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
      {/* Header with Save/Discard — only shown when there are changes or save feedback */}
      {(isDirty || saveStatus === 'success') && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
                className="px-4 py-2 text-sm font-medium rounded-lg bg-input text-on-surface-muted hover:bg-input-hover hover:text-on-surface transition-colors disabled:opacity-50"
              >
                Discard
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || saveStatus === 'saving'}
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25"
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
      )}

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
        <MovieColumn
          title="In Theaters"
          movies={movies}
          isLoading={isLoading}
          emptyText="No movies currently in theaters"
          isEffectivelyOn={(id) => isEffectivelyOn(id, true)}
          getPendingDate={getPendingDate}
          onToggle={(m, d) => handleToggle(m.id, m.title, m.poster_url, false, d)}
          onRevert={removePendingChange}
          onDateChange={updatePendingDate}
          dateLabel="End date"
          maxDate={today}
        />
        <MovieColumn
          title="Upcoming"
          movies={upcoming}
          isLoading={upcomingLoading}
          emptyText="No upcoming releases"
          isEffectivelyOn={(id) => isEffectivelyOn(id, false)}
          getPendingDate={getPendingDate}
          onToggle={(m, d) => handleToggle(m.id, m.title, m.poster_url, true, d)}
          onRevert={removePendingChange}
          onDateChange={updatePendingDate}
          dateLabel="Start date"
          minDate={today}
          getSubtitle={(m) => (m.release_date ? daysUntil(m.release_date) : undefined)}
        />
      </div>
    </div>
  );
}
