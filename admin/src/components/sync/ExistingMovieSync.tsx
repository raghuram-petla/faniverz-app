'use client';

/**
 * Collapsible section for existing movies discovered during TMDB sync.
 * Per-movie expandable rows show field-level diff via FieldDiffPanel.
 * Section header exposes "Bulk fill missing" for all movies with gaps.
 *
 * @contract: renders a collapsible per-movie field-diff UI for existing movies
 * @coupling: useBulkFillMissing handles sequential fill; FieldDiffPanel handles diff UI
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown, Loader2, Film } from 'lucide-react';
import { useTmdbLookup, useFillFields, type ExistingMovieData } from '@/hooks/useSync';
import { countMissing, getMissingFields } from '@/lib/syncUtils';
import { useBulkFillMissing } from '@/hooks/useBulkFillMissing';
import { FieldDiffPanel } from './FieldDiffPanel';

// ── Main section component ────────────────────────────────────────────────────

export interface ExistingMovieSyncProps {
  movies: ExistingMovieData[];
}

/** @contract collapsible section: header shows counts + bulk fill; body shows per-movie rows */
export function ExistingMovieSync({ movies }: ExistingMovieSyncProps) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const gapped = movies.filter((m) => countMissing(m) > 0);
  const bulk = useBulkFillMissing();

  const handleBulkFill = async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't toggle section
    await bulk.run(movies);
  };

  return (
    <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
      {/* @edge: outer toggle is a div (not button) — the inner "Fill all missing" is a button,
          and nested <button> inside <button> is invalid HTML per the spec. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setSectionOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSectionOpen((o) => !o);
          }
        }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-elevated transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {sectionOpen ? (
            <ChevronDown className="w-4 h-4 text-on-surface-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-on-surface-muted" />
          )}
          <span className="text-sm font-semibold text-on-surface">
            Existing movies — fill missing fields
          </span>
          <span className="text-xs text-on-surface-muted">({movies.length})</span>
        </div>
        <div className="flex items-center gap-3">
          {gapped.length > 0 && !bulk.state.isRunning && (
            <button
              onClick={(e) => void handleBulkFill(e)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Fill all missing ({gapped.length})
            </button>
          )}
          {bulk.state.isRunning && (
            <span className="text-xs text-on-surface-muted flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {bulk.state.done}/{bulk.state.total}
            </span>
          )}
          {!bulk.state.isRunning && bulk.state.total > 0 && (
            <span className="text-xs text-status-green">
              {bulk.state.done} filled
              {bulk.state.failed > 0 && `, ${bulk.state.failed} failed`}
            </span>
          )}
          <span className="text-xs text-on-surface-subtle">{gapped.length} have gaps</span>
        </div>
      </div>

      {sectionOpen && (
        <div className="divide-y divide-outline">
          {movies.map((movie) => (
            <ExistingMovieRow key={movie.tmdb_id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-movie row ─────────────────────────────────────────────────────────────

function ExistingMovieRow({ movie }: { movie: ExistingMovieData }) {
  const [open, setOpen] = useState(false);
  const [appliedFields, setAppliedFields] = useState<string[]>([]);
  const lookup = useTmdbLookup();
  const fillFields = useFillFields();

  // @invariant: only show tmdb panel when the lookup result matches this movie's tmdb_id
  const tmdbData =
    lookup.data?.type === 'movie' && lookup.data.data.tmdbId === movie.tmdb_id
      ? lookup.data.data
      : null;

  // @edge: recompute missing count after fields are applied
  const missingCount =
    countMissing(movie) -
    appliedFields.filter((f) => getMissingFields(movie).map(String).includes(f)).length;

  const handleToggle = () => {
    if (!open && !tmdbData && !lookup.isPending) {
      lookup.mutate({ tmdbId: movie.tmdb_id, type: 'movie' });
    }
    setOpen((o) => !o);
  };

  const handleApply = async (fields: string[], forceResyncCast: boolean) => {
    const payload: { tmdbId: number; fields: string[]; forceResyncCast?: boolean } = {
      tmdbId: movie.tmdb_id,
      fields,
    };
    if (forceResyncCast) payload.forceResyncCast = true;
    const res = await fillFields.mutateAsync(payload);
    setAppliedFields((prev) => [...new Set([...prev, ...res.updatedFields])]);
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-elevated transition-colors text-left"
      >
        <div className="w-10 h-14 bg-surface-muted rounded shrink-0 overflow-hidden">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title ?? ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-4 h-4 text-on-surface-disabled" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-on-surface truncate">{movie.title ?? '—'}</p>
          {missingCount > 0 ? (
            <p className="text-xs text-status-yellow mt-0.5">
              {missingCount} field{missingCount !== 1 ? 's' : ''} missing
            </p>
          ) : (
            <p className="text-xs text-status-green mt-0.5">All fields filled</p>
          )}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-on-surface-muted shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-on-surface-muted shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-4 bg-surface-muted/30">
          {lookup.isPending && (
            <div className="flex items-center gap-2 py-4 text-sm text-on-surface-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching from TMDB…
            </div>
          )}
          {lookup.isError && (
            <p className="py-3 text-sm text-status-red">
              {lookup.error instanceof Error ? lookup.error.message : 'TMDB fetch failed'}
            </p>
          )}
          {/* @contract: fillFields.isError surfaces the error inline so admin gets feedback */}
          {fillFields.isError && (
            <p className="py-2 text-sm text-status-red">
              {fillFields.error instanceof Error ? fillFields.error.message : 'Apply failed'}
            </p>
          )}
          {tmdbData && (
            <FieldDiffPanel
              movie={movie}
              tmdb={tmdbData}
              appliedFields={appliedFields}
              isSaving={fillFields.isPending}
              onApply={handleApply}
            />
          )}
        </div>
      )}
    </div>
  );
}
