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
import { getStatus, buildFieldDefs } from './fieldDiffHelpers';
import { FieldDiffRow } from './FieldDiffRow';

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
  const DATA_FIELDS = buildFieldDefs(movie, tmdb);

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

  // @edge After bulk fill, movie prop updates and fields become 'same' — clear them from selected
  useEffect(() => {
    const sameKeys = new Set(allRows.filter((r) => r.status === 'same').map((r) => r.key));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of prev) {
        if (sameKeys.has(k)) next.delete(k);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie]);

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

  const canApply = selected.size > 0 || forceResyncCast;

  // @contract Media URL map for poster/backdrop preview thumbnails in FieldDiffRow
  const dbMediaUrls: Record<string, string | null> = {
    poster_url: movie.poster_url ?? null,
    backdrop_url: movie.backdrop_url ?? null,
  };
  const tmdbMediaUrls: Record<string, string | null> = {
    poster_url: tmdb.posterUrl ?? null,
    backdrop_url: tmdb.backdropUrl ?? null,
  };

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
            {rows.map((row, i) => (
              <FieldDiffRow
                key={row.key}
                fieldKey={row.key}
                label={row.label}
                dbDisplay={row.dbDisplay}
                tmdbDisplay={row.tmdbDisplay}
                status={row.status}
                isApplied={appliedFields.includes(row.key)}
                isSelected={selected.has(row.key)}
                isSaving={isSaving}
                dbMediaUrl={dbMediaUrls[row.key]}
                tmdbMediaUrl={tmdbMediaUrls[row.key]}
                rowBg={i % 2 === 1 ? 'bg-surface-elevated/50' : ''}
                onToggle={toggle}
              />
            ))}
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

      {/* ── Apply button — hidden when nothing actionable ── */}
      {(canApply || isSaving) && (
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
      )}
    </div>
  );
}
