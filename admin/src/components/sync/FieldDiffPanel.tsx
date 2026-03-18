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
import { type FieldStatus, extractYouTubeId, getStatus, fmt, truncate } from './fieldDiffHelpers';

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
      dbDisplay: movie.synopsis ?? '',
      tmdbDisplay: tmdb.overview ?? '',
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
      dbDisplay: extractYouTubeId(movie.trailer_url) ?? (movie.trailer_url ? '✓ set' : ''),
      tmdbDisplay: extractYouTubeId(tmdb.trailerUrl) ?? (tmdb.trailerUrl ? '✓ available' : ''),
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
      dbDisplay: movie.runtime ? `${movie.runtime} min` : '',
      // @edge TMDB runtime=0 means unknown — display as empty
      tmdbDisplay: tmdb.runtime ? `${tmdb.runtime} min` : '',
    },
    {
      key: 'genres',
      label: 'Genres',
      dbDisplay: fmt(movie.genres),
      tmdbDisplay: tmdb.genres.join(', '),
    },
  ];

  const allRows = DATA_FIELDS.map((f) => ({ ...f, status: getStatus(movie, tmdb, f.key) }));
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? allRows : allRows.filter((r) => r.status !== 'same');
  const sameCount = allRows.filter((r) => r.status === 'same').length;

  // Pre-check missing fields; leave changed fields unchecked by default
  const defaultSelected = new Set<FillableField>(
    allRows
      .filter((r) => r.status === 'missing' && !appliedFields.includes(r.key))
      .map((r) => r.key),
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
      {rows.length > 0 && (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left text-on-surface-muted font-bold py-1.5 pr-3 w-6" />
              <th className="text-left text-on-surface-muted font-bold py-1.5 pr-3">Field</th>
              <th className="text-left text-on-surface-muted font-bold py-1.5 pr-3">In Faniverz</th>
              <th className="text-left text-on-surface-muted font-bold py-1.5 pr-3">In TMDB</th>
              <th className="text-right text-on-surface-muted font-bold py-1.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isApplied = appliedFields.includes(row.key);
              const rowBg = i % 2 === 1 ? 'bg-surface-elevated/50' : '';
              const dbYtId = row.key === 'trailer_url' ? extractYouTubeId(movie.trailer_url) : null;
              const tmdbYtId = row.key === 'trailer_url' ? extractYouTubeId(tmdb.trailerUrl) : null;
              return (
                <tr key={row.key} className={rowBg}>
                  <td className="py-2 pr-3 align-top">
                    <input
                      type="checkbox"
                      checked={isApplied || selected.has(row.key)}
                      disabled={isApplied || isSaving}
                      onChange={() => toggle(row.key)}
                      className="accent-red-600"
                    />
                  </td>
                  <td
                    className={`py-2 pr-3 align-top ${isApplied ? 'line-through text-on-surface-disabled' : 'text-on-surface'}`}
                  >
                    {row.label}
                  </td>
                  <td
                    className={`py-2 pr-3 align-top ${row.status === 'same' ? 'text-on-surface-subtle' : row.status === 'missing' ? 'text-status-red' : 'text-on-surface-subtle'}`}
                  >
                    {isApplied ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-status-green inline" />
                    ) : (
                      row.dbDisplay || '—'
                    )}
                    {row.key === 'poster_url' && movie.poster_url && (
                      <img
                        src={movie.poster_url}
                        alt=""
                        className="w-12 h-16 object-cover rounded mt-1"
                      />
                    )}
                    {row.key === 'backdrop_url' && movie.backdrop_url && (
                      <img
                        src={movie.backdrop_url}
                        alt=""
                        className="w-24 h-14 object-cover rounded mt-1"
                      />
                    )}
                    {dbYtId && (
                      <a
                        href={`https://www.youtube.com/watch?v=${dbYtId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${dbYtId}/mqdefault.jpg`}
                          alt=""
                          className="w-32 h-18 object-cover rounded mt-1 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    )}
                  </td>
                  <td className="py-2 pr-3 align-top text-on-surface-subtle">
                    {row.tmdbDisplay || '—'}
                    {row.key === 'poster_url' && tmdb.posterUrl && (
                      <img
                        src={tmdb.posterUrl}
                        alt=""
                        className="w-12 h-16 object-cover rounded mt-1"
                      />
                    )}
                    {row.key === 'backdrop_url' && tmdb.backdropUrl && (
                      <img
                        src={tmdb.backdropUrl}
                        alt=""
                        className="w-24 h-14 object-cover rounded mt-1"
                      />
                    )}
                    {tmdbYtId && (
                      <a
                        href={`https://www.youtube.com/watch?v=${tmdbYtId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${tmdbYtId}/mqdefault.jpg`}
                          alt=""
                          className="w-32 h-18 object-cover rounded mt-1 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    )}
                  </td>
                  <td className={`py-2 align-top text-right ${statusColor[row.status]}`}>
                    {isApplied ? '' : statusLabel[row.status]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {sameCount > 0 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-on-surface-muted hover:text-on-surface transition-colors"
        >
          {showAll ? 'Hide' : 'Show'} {sameCount} unchanged field{sameCount !== 1 ? 's' : ''}
        </button>
      )}

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
