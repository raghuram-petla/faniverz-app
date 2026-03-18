'use client';

/**
 * Field-level diff table for comparing DB vs TMDB movie data.
 * Renders a checkbox table with missing/changed/same status per field.
 *
 * @contract: missing fields are pre-checked (green); changed fields are unchecked (amber)
 * so admin must explicitly opt in; same fields are disabled (gray).
 * @coupling: depends on syncUtils for field helpers, useSync for types.
 */

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';
import type { FillableField } from '@/lib/syncUtils';

// ── Helpers ───────────────────────────────────────────────────────────────────

type FieldStatus = 'missing' | 'changed' | 'same';

/** @edge genres: sorted join for stable comparison regardless of TMDB order */
function genreStatus(db: string[] | null, tmdb: string[]): FieldStatus {
  if (!db?.length) return 'missing';
  return [...db].sort().join(',') === [...tmdb].sort().join(',') ? 'same' : 'changed';
}

function getStatus(
  movie: ExistingMovieData,
  tmdb: LookupMovieData,
  field: FillableField,
): FieldStatus {
  switch (field) {
    case 'title':
      if (!movie.title) return 'missing';
      return movie.title === tmdb.title ? 'same' : 'changed';
    case 'synopsis':
      if (!movie.synopsis) return 'missing';
      return movie.synopsis === tmdb.overview ? 'same' : 'changed';
    case 'poster_url':
      // @edge R2 URL vs TMDB CDN path are incomparable — always show as actionable
      return !movie.poster_url ? 'missing' : 'changed';
    case 'backdrop_url':
      return !movie.backdrop_url ? 'missing' : 'changed';
    case 'trailer_url':
      // @edge extracted YouTube URL vs TMDB video list are incomparable
      return !movie.trailer_url ? 'missing' : 'changed';
    case 'director':
      if (!movie.director) return 'missing';
      return movie.director === tmdb.director ? 'same' : 'changed';
    case 'runtime':
      if (movie.runtime == null) return 'missing';
      return movie.runtime === tmdb.runtime ? 'same' : 'changed';
    case 'genres':
      return genreStatus(movie.genres, tmdb.genres);
    case 'cast':
      return 'missing'; // always actionable — server guards against duplicate sync
    default:
      return 'missing';
  }
}

function fmt(val: string | string[] | number | null | undefined): string {
  if (val == null) return '';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'number') return String(val);
  return val;
}

function truncate(s: string | null | undefined, n = 80): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface FieldDiffPanelProps {
  movie: ExistingMovieData;
  tmdb: LookupMovieData;
  appliedFields: string[];
  isSaving: boolean;
  /** @sideeffect Calls fill-fields API with selected field keys */
  onApply: (fields: string[], forceResyncCast: boolean) => Promise<void>;
}

/**
 * Renders a field comparison table (DB vs TMDB) with per-field checkboxes.
 * missing=green+pre-checked, changed=amber+unchecked, same=gray+disabled.
 */
export function FieldDiffPanel({
  movie,
  tmdb,
  appliedFields,
  isSaving,
  onApply,
}: FieldDiffPanelProps) {
  const DATA_FIELDS: Array<{
    key: FillableField;
    label: string;
    dbDisplay: string;
    tmdbDisplay: string;
  }> = [
    { key: 'title', label: 'Title', dbDisplay: fmt(movie.title), tmdbDisplay: fmt(tmdb.title) },
    {
      key: 'synopsis',
      label: 'Synopsis',
      dbDisplay: truncate(movie.synopsis),
      tmdbDisplay: truncate(tmdb.overview),
    },
    {
      key: 'poster_url',
      label: 'Poster',
      dbDisplay: movie.poster_url ? '✓ set' : '',
      tmdbDisplay: tmdb.posterUrl ? '✓ available' : '',
    },
    {
      key: 'backdrop_url',
      label: 'Backdrop',
      dbDisplay: movie.backdrop_url ? '✓ set' : '',
      tmdbDisplay: tmdb.backdropUrl ? '✓ available' : '',
    },
    {
      key: 'trailer_url',
      label: 'Trailer',
      dbDisplay: movie.trailer_url ? '✓ set' : '',
      tmdbDisplay: 'YouTube (will extract)',
    },
    {
      key: 'director',
      label: 'Director',
      dbDisplay: fmt(movie.director),
      tmdbDisplay: fmt(tmdb.director),
    },
    {
      key: 'runtime',
      label: 'Runtime',
      dbDisplay: movie.runtime != null ? `${movie.runtime} min` : '',
      tmdbDisplay: tmdb.runtime != null ? `${tmdb.runtime} min` : '',
    },
    {
      key: 'genres',
      label: 'Genres',
      dbDisplay: fmt(movie.genres),
      tmdbDisplay: tmdb.genres.join(', '),
    },
  ];

  const rows = DATA_FIELDS.map((f) => ({ ...f, status: getStatus(movie, tmdb, f.key) }));

  // Pre-check missing fields; leave changed fields unchecked by default
  const defaultSelected = new Set<FillableField>(
    rows.filter((r) => r.status === 'missing' && !appliedFields.includes(r.key)).map((r) => r.key),
  );
  const [selected, setSelected] = useState<Set<FillableField>>(defaultSelected);
  const [forceResyncCast, setForceResyncCast] = useState(false);

  // Deselect fields that were already applied
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      appliedFields.forEach((f) => next.delete(f as FillableField));
      return next;
    });
  }, [appliedFields]);

  const toggle = (key: FillableField) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleApply = () => {
    const fields = Array.from(selected);
    if (fields.length === 0 && !forceResyncCast) return;
    // @sideeffect: onApply returns Promise<void>; void-cast intentional — isSaving driven
    // by fillFields.isPending from TanStack Query, not by awaiting this call directly
    void onApply(fields, forceResyncCast);
  };

  const statusColor: Record<FieldStatus, string> = {
    missing: 'text-status-green',
    changed: 'text-status-yellow',
    same: 'text-on-surface-disabled',
  };
  const statusLabel: Record<FieldStatus, string> = {
    missing: 'missing',
    changed: 'changed',
    same: 'same',
  };

  const canApply = selected.size > 0 || forceResyncCast;

  return (
    <div className="mt-3 space-y-3">
      {/* ── Field diff table ── */}
      <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-x-3 gap-y-1.5 text-xs items-center">
        <span />
        <span className="text-on-surface-muted font-medium">Field</span>
        <span className="text-on-surface-muted font-medium">In DB</span>
        <span className="text-on-surface-muted font-medium">From TMDB</span>
        <span className="text-on-surface-muted font-medium">Status</span>

        {rows.map((row) => {
          const isApplied = appliedFields.includes(row.key);
          const isSame = row.status === 'same';
          return [
            <input
              key={`chk-${row.key}`}
              type="checkbox"
              checked={isApplied || selected.has(row.key)}
              disabled={isApplied || isSame || isSaving}
              onChange={() => toggle(row.key)}
              className="mt-0.5 accent-red-600"
            />,
            <span
              key={`lbl-${row.key}`}
              className={isApplied ? 'line-through text-on-surface-disabled' : 'text-on-surface'}
            >
              {row.label}
            </span>,
            <span
              key={`db-${row.key}`}
              className={
                isSame
                  ? 'text-on-surface-subtle'
                  : row.status === 'missing'
                    ? 'text-status-red'
                    : 'text-on-surface-subtle'
              }
            >
              {isApplied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-status-green inline" />
              ) : (
                row.dbDisplay || '—'
              )}
            </span>,
            <span key={`tmdb-${row.key}`} className="text-on-surface-subtle">
              {row.tmdbDisplay || '—'}
            </span>,
            <span key={`status-${row.key}`} className={statusColor[row.status]}>
              {isApplied ? '' : statusLabel[row.status]}
            </span>,
          ];
        })}
      </div>

      {/* ── Cast re-sync row ── */}
      <div className="flex items-center gap-2 pt-1 border-t border-outline">
        <input
          type="checkbox"
          id={`cast-resync-${movie.tmdb_id}`}
          checked={forceResyncCast}
          onChange={(e) => setForceResyncCast(e.target.checked)}
          disabled={isSaving}
          className="accent-red-600"
        />
        <label
          htmlFor={`cast-resync-${movie.tmdb_id}`}
          className="text-xs text-on-surface-muted cursor-pointer"
        >
          Re-sync cast & crew{' '}
          <span className="text-status-yellow">⚠️ overwrites existing cast</span>
        </label>
        <span className="text-xs text-on-surface-subtle ml-auto">
          {tmdb.castCount} cast · {tmdb.crewCount} crew from TMDB
        </span>
      </div>

      {/* ── Apply button ── */}
      <button
        onClick={handleApply}
        disabled={!canApply || isSaving}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <CheckCircle2 className="w-3 h-3" />
        )}
        Apply {selected.size} selected field{selected.size !== 1 ? 's' : ''}
        {forceResyncCast && ' + cast'}
      </button>
    </div>
  );
}
