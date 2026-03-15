'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Plus, Minus, Film, ChevronUp, ChevronDown } from 'lucide-react';
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

export interface PendingChangesDockProps {
  changes: PendingChangeItem[];
  onDateChange: (movieId: string, date: string) => void;
  onRemove: (movieId: string) => void;
  today: string;
}

const ROW_HEIGHT = 44;

// @contract Compact pending changes list for the bottom dock with scroll indicators
export function PendingChangesDock({
  changes,
  onDateChange,
  onRemove,
  today,
}: PendingChangesDockProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 2);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

  // @sideeffect Re-check scroll state when changes count updates
  useEffect(() => {
    checkScroll();
  }, [changes.length, checkScroll]);

  if (changes.length === 0) return null;

  const additions = changes.filter((c) => c.inTheaters);
  const removals = changes.filter((c) => !c.inTheaters);

  const scrollBy = (dir: 'up' | 'down') => {
    scrollRef.current?.scrollBy({
      top: dir === 'down' ? ROW_HEIGHT : -ROW_HEIGHT,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative">
      {/* Scroll-up indicator */}
      {canScrollUp && (
        <button
          onClick={() => scrollBy('up')}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pt-0.5 pb-1 px-3 rounded-b-lg bg-dock border border-t-0 border-outline text-on-surface-muted hover:text-on-surface transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5 animate-bounce" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="px-4 pt-3 pb-2 space-y-1 max-h-48 overflow-y-auto select-none"
      >
        {additions.length > 0 && (
          <>
            <p className="text-xs font-medium text-green-400 uppercase tracking-wider px-1">
              Adding to theaters
            </p>
            {additions.map((c) => (
              <DockRow
                key={c.movieId}
                change={c}
                onDateChange={onDateChange}
                onRemove={onRemove}
                dateLabel="Start date"
                minDate={today}
              />
            ))}
          </>
        )}
        {removals.length > 0 && (
          <>
            <p className="text-xs font-medium text-red-400 uppercase tracking-wider px-1">
              Removing from theaters
            </p>
            {removals.map((c) => (
              <DockRow
                key={c.movieId}
                change={c}
                onDateChange={onDateChange}
                onRemove={onRemove}
                dateLabel="End date"
                maxDate={today}
              />
            ))}
          </>
        )}
      </div>

      {/* Scroll-down indicator */}
      {canScrollDown && (
        <button
          onClick={() => scrollBy('down')}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pb-0.5 pt-1 px-3 rounded-t-lg bg-dock border border-b-0 border-outline text-on-surface-muted hover:text-on-surface transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
        </button>
      )}
    </div>
  );
}

// @contract Compact pending change row for the bottom dock
function DockRow({
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
    <div className="flex items-center gap-2 px-2 py-1.5 bg-dock-row rounded-lg">
      <button
        onClick={() => onRemove(change.movieId)}
        className="p-0.5 rounded text-on-surface-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
        aria-label={`Undo ${change.title}`}
      >
        <X className="w-3 h-3" />
      </button>
      <div className={`p-0.5 rounded ${change.inTheaters ? 'bg-green-600/20' : 'bg-red-600/20'}`}>
        {change.inTheaters ? (
          <Plus className="w-2.5 h-2.5 text-green-400" />
        ) : (
          <Minus className="w-2.5 h-2.5 text-red-400" />
        )}
      </div>
      {change.posterUrl ? (
        <img
          src={getImageUrl(change.posterUrl, 'sm') ?? change.posterUrl}
          alt=""
          className="w-6 h-8 rounded object-cover shrink-0"
        />
      ) : (
        <div className="w-6 h-8 rounded bg-input flex items-center justify-center shrink-0">
          <Film className="w-2.5 h-2.5 text-on-surface-subtle" />
        </div>
      )}
      <span className="text-xs font-medium text-on-surface truncate flex-1 min-w-0">
        {change.title}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-on-surface-muted">{dateLabel}</span>
        <input
          type="date"
          value={change.date}
          onChange={(e) => onDateChange(change.movieId, e.target.value)}
          max={maxDate}
          min={minDate}
          className="bg-input rounded px-1 py-0.5 text-[11px] text-on-surface outline-none focus:ring-1 focus:ring-red-600 w-[110px]"
        />
      </div>
    </div>
  );
}
