'use client';
import { X, Plus, Minus, Film } from 'lucide-react';
import { getImageUrl } from '@shared/imageUrl';

// @contract Displays all pending changes as a staging area before Save
export interface PendingChangeItem {
  movieId: string;
  title: string;
  posterUrl: string | null;
  inTheaters: boolean;
  date: string;
  label?: string | null;
}

export interface PendingChangesSectionProps {
  changes: PendingChangeItem[];
  onDateChange: (movieId: string, date: string) => void;
  onRemove: (movieId: string) => void;
  today: string;
}

export function PendingChangesSection({
  changes,
  onDateChange,
  onRemove,
  today,
}: PendingChangesSectionProps) {
  if (changes.length === 0) return null;

  const additions = changes.filter((c) => c.inTheaters);
  const removals = changes.filter((c) => !c.inTheaters);

  return (
    <section>
      <h2 className="text-lg font-semibold text-on-surface mb-3">
        Pending Changes
        <span className="ml-2 text-sm font-normal text-amber-400">({changes.length})</span>
      </h2>
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-2">
        {additions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-green-400 uppercase tracking-wider px-1">
              Adding to theaters
            </p>
            {additions.map((c) => (
              <PendingRow
                key={c.movieId}
                change={c}
                onDateChange={onDateChange}
                onRemove={onRemove}
                dateLabel="Start date"
                minDate={today}
              />
            ))}
          </div>
        )}
        {removals.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-red-400 uppercase tracking-wider px-1">
              Removing from theaters
            </p>
            {removals.map((c) => (
              <PendingRow
                key={c.movieId}
                change={c}
                onDateChange={onDateChange}
                onRemove={onRemove}
                dateLabel="End date"
                maxDate={today}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// @contract Single pending change row with editable date and undo button
function PendingRow({
  change,
  onDateChange,
  onRemove,
  dateLabel,
  maxDate,
  minDate,
}: {
  change: PendingChangeItem;
  onDateChange: (movieId: string, date: string) => void;
  onRemove: (movieId: string) => void;
  dateLabel: string;
  maxDate?: string;
  minDate?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-surface-card rounded-lg">
      {/* Icon */}
      <div className={`p-1 rounded ${change.inTheaters ? 'bg-green-600/20' : 'bg-red-600/20'}`}>
        {change.inTheaters ? (
          <Plus className="w-3 h-3 text-green-400" />
        ) : (
          <Minus className="w-3 h-3 text-red-400" />
        )}
      </div>

      {/* Poster */}
      {change.posterUrl ? (
        <img
          src={getImageUrl(change.posterUrl, 'sm') ?? change.posterUrl}
          alt=""
          className="w-8 h-11 rounded object-cover shrink-0"
        />
      ) : (
        <div className="w-8 h-11 rounded bg-input flex items-center justify-center shrink-0">
          <Film className="w-3 h-3 text-on-surface-subtle" />
        </div>
      )}

      {/* Title + label */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate">{change.title}</p>
        {change.label && <p className="text-xs text-on-surface-muted">{change.label}</p>}
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-on-surface-muted">{dateLabel}</span>
        <input
          type="date"
          value={change.date}
          onChange={(e) => onDateChange(change.movieId, e.target.value)}
          max={maxDate}
          min={minDate}
          className="bg-input rounded-md px-1.5 py-0.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-red-600 w-[120px]"
        />
      </div>

      {/* Undo */}
      <button
        onClick={() => onRemove(change.movieId)}
        className="p-1 rounded-md text-on-surface-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
        aria-label={`Undo ${change.title}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
