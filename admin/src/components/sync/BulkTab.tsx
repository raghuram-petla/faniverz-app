'use client';

import { useState } from 'react';
import { useStaleItems, useRefreshMovie, useRefreshActor } from '@/hooks/useSync';
import { StaleMoviesSection, MissingBiosSection, BulkProgressPanel } from './BulkSections';

/** @contract orchestrates bulk TMDB sync: stale movie refresh + missing actor bio fetch */
export function BulkTab() {
  const [staleDays, setStaleDays] = useState(30);
  const [sinceYear, setSinceYear] = useState(new Date().getFullYear() - 3);
  const staleMovies = useStaleItems('movies', staleDays, sinceYear);
  const missingBios = useStaleItems('actors-missing-bios', undefined, sinceYear);
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

  /**
   * @sideeffect sequentially refreshes each stale movie via TMDB API
   * @edge errors are accumulated, not thrown — bulk operation continues on individual failures
   */
  const handleBulkRefreshMovies = async () => {
    const items = staleMovies.data?.items ?? [];
    if (items.length === 0) return;
    if (!confirm(`Refresh ${items.length} stale movies from TMDB? This may take a while.`)) return;

    setBulkProgress({ type: 'movies', total: items.length, completed: 0, current: '', errors: [] });

    for (const item of items) {
      setBulkProgress((prev) => ({ ...prev!, current: item.title ?? 'Unknown' }));
      try {
        await refreshMovie.mutateAsync(item.id);
      } catch (err) {
        setBulkProgress((prev) => ({
          ...prev!,
          errors: [
            ...prev!.errors,
            `${item.title}: ${err instanceof Error ? err.message : 'Failed'}`,
          ],
        }));
      }
      setBulkProgress((prev) => ({ ...prev!, completed: prev!.completed + 1 }));
    }
  };

  /** @sideeffect sequentially fetches bio for each actor with missing biography via TMDB API */
  const handleBulkRefreshActors = async () => {
    const items = missingBios.data?.items ?? [];
    if (items.length === 0) return;
    if (!confirm(`Fetch bios for ${items.length} actors from TMDB? This may take a while.`)) return;

    setBulkProgress({ type: 'actors', total: items.length, completed: 0, current: '', errors: [] });

    for (const item of items) {
      setBulkProgress((prev) => ({ ...prev!, current: item.name ?? 'Unknown' }));
      try {
        await refreshActor.mutateAsync(item.id);
      } catch (err) {
        setBulkProgress((prev) => ({
          ...prev!,
          errors: [
            ...prev!.errors,
            `${item.name}: ${err instanceof Error ? err.message : 'Failed'}`,
          ],
        }));
      }
      setBulkProgress((prev) => ({ ...prev!, completed: prev!.completed + 1 }));
    }
  };

  /** @invariant isBulkRunning guards both Refresh All and Fetch All buttons to prevent concurrent bulk ops */
  const isBulkRunning = bulkProgress !== null && bulkProgress.completed < bulkProgress.total;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <StaleMoviesSection
          staleDays={staleDays}
          onStaleDaysChange={setStaleDays}
          sinceYear={sinceYear}
          onSinceYearChange={setSinceYear}
          staleMovies={staleMovies}
          showList={showStaleList}
          onToggleList={() => setShowStaleList((v) => !v)}
          onRefreshAll={handleBulkRefreshMovies}
          isBulkRunning={isBulkRunning}
        />

        <MissingBiosSection
          missingBios={missingBios}
          showList={showBioList}
          onToggleList={() => setShowBioList((v) => !v)}
          onFetchAll={handleBulkRefreshActors}
          isBulkRunning={isBulkRunning}
        />
      </div>

      {bulkProgress && <BulkProgressPanel progress={bulkProgress} />}
    </div>
  );
}
