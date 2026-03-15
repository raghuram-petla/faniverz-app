'use client';
import { useState, useCallback } from 'react';
import {
  useTheaterMovies,
  useUpcomingMovies,
  useTheaterSearch,
  useAddToTheaters,
  useRemoveFromTheaters,
} from '@/hooks/useTheaterMovies';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';
import { MovieColumn } from '@/components/theaters/MovieColumn';
import { ManualAddPanel } from '@/components/theaters/ManualAddPanel';
import { PendingChangesDock, type DateAction } from '@/components/theaters/PendingChangesSection';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

// @contract Pending change: toggle direction + date + movie title for display + optional label
// @edge When inTheaters=true and date < releaseDate, dateAction determines what gets updated

interface PendingChange {
  inTheaters: boolean;
  date: string;
  title: string;
  posterUrl: string | null;
  label?: string | null;
  releaseDate: string | null;
  dateAction: DateAction;
}

function daysUntil(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff <= 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`;
}

export default function TheatersPage() {
  const { isReadOnly } = usePermissions();
  const { data: theaterMovies, isLoading } = useTheaterMovies();
  const { data: upcomingMovies, isLoading: upcomingLoading } = useUpcomingMovies();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const { data: searchResults, isFetching: isSearching } = useTheaterSearch(debouncedSearch);
  const addToTheaters = useAddToTheaters();
  const removeFromTheaters = useRemoveFromTheaters();
  const today = new Date().toISOString().split('T')[0];

  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

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
      releaseDate: string | null,
    ) => {
      setPendingChanges((prev) => {
        const next = new Map(prev);
        next.set(movieId, {
          inTheaters,
          date: defaultDate,
          title,
          posterUrl,
          releaseDate,
          dateAction: 'none',
        });
        return next;
      });
    },
    [],
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

  const updatePendingDateAction = useCallback((movieId: string, action: DateAction) => {
    setPendingChanges((prev) => {
      const existing = prev.get(movieId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(movieId, { ...existing, dateAction: action });
      return next;
    });
  }, []);

  const removePendingChange = useCallback((movieId: string) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.delete(movieId);
      return next;
    });
  }, []);

  // @sideeffect Commits all pending changes
  async function handleSave() {
    setSaveStatus('saving');
    const entries = Array.from(pendingChanges.entries());
    const additions = entries.filter(([, c]) => c.inTheaters);
    const removals = entries.filter(([, c]) => !c.inTheaters);

    try {
      await Promise.all([
        ...additions.map(([movieId, c]) => {
          const premiereDate = c.dateAction === 'premiere' ? c.date : null;
          const newReleaseDate = c.dateAction === 'release_changed' ? c.date : null;
          return addToTheaters.mutateAsync({
            movieId,
            startDate: c.date,
            label: c.label ?? null,
            premiereDate,
            newReleaseDate,
          });
        }),
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

  const handleDiscard = () => setPendingChanges(new Map());

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
    releaseDate: string | null,
  ) {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(movieId, {
        inTheaters: true,
        date: startDate,
        title,
        posterUrl,
        label,
        releaseDate,
        dateAction: 'none',
      });
      return next;
    });
  }

  const pendingEntries = Array.from(pendingChanges.entries()).map(([movieId, c]) => ({
    movieId,
    ...c,
  }));

  return (
    <div className="space-y-6">
      {/* Add a Movie */}
      {!isReadOnly && (
        <ManualAddPanel
          search={search}
          setSearch={setSearch}
          debouncedSearch={debouncedSearch}
          isSearching={isSearching}
          results={results}
          onAdd={handleManualAdd}
          isAdding={addToTheaters.isPending}
        />
      )}

      {/* Two columns — In Theaters | Upcoming */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-6${isReadOnly ? ' pointer-events-none opacity-70' : ''}`}
      >
        <MovieColumn
          title="In Theaters"
          movies={movies}
          isLoading={isLoading}
          emptyText="No movies currently in theaters"
          isEffectivelyOn={(id) => isEffectivelyOn(id, true)}
          getPendingDate={getPendingDate}
          onToggle={(m, d) => handleToggle(m.id, m.title, m.poster_url, false, d, m.release_date)}
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
          onToggle={(m, d) => handleToggle(m.id, m.title, m.poster_url, true, d, m.release_date)}
          onRevert={removePendingChange}
          onDateChange={updatePendingDate}
          dateLabel="Start date"
          maxDate={today}
          getSubtitle={(m) => (m.release_date ? daysUntil(m.release_date) : undefined)}
        />
      </div>

      {/* @sideeffect Sticky bottom dock — pending changes + actions.
          Centered floating panel, doesn't overlap sidebar. */}
      {(isDirty || saveStatus === 'success') && (
        <div className="sticky bottom-4 z-40 max-w-2xl mx-auto mt-6 rounded-2xl border border-dock-border bg-dock shadow-dock">
          {isDirty && (
            <>
              <PendingChangesDock
                changes={pendingEntries}
                onDateChange={updatePendingDate}
                onDateActionChange={updatePendingDateAction}
                onRemove={removePendingChange}
                today={today}
              />
              {/* Action bar */}
              <div className="px-4 py-2.5 border-t border-outline flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-amber opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-amber" />
                  </span>
                  <span className="text-sm font-medium text-status-amber">
                    {changeCount} unsaved change{changeCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDiscard}
                    disabled={saveStatus === 'saving'}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-input text-on-surface-muted hover:bg-input-hover hover:text-on-surface transition-colors disabled:opacity-50"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
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
            </>
          )}
          {saveStatus === 'success' && !isDirty && (
            <div className="px-4 py-3 flex items-center gap-2 text-status-green">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                ✓ Changes saved successfully
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
