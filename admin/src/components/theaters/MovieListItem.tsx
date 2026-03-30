'use client';
import Link from 'next/link';
import { Film, Pencil } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getImageUrl, posterBucket } from '@shared/imageUrl';
import { ToggleSwitch } from './ToggleSwitch';

// @contract Compact movie item — toggle immediately flips and shows editable date inline
export interface MovieListItemProps {
  id: string;
  title: string;
  posterUrl: string | null;
  /** @contract determines R2 bucket — 'backdrop' when a backdrop is used as poster */
  posterImageType?: 'poster' | 'backdrop' | null;
  releaseDate: string | null;
  isOn: boolean;
  pendingDate?: string;
  onToggle: (defaultDate: string) => void;
  onRevert: () => void;
  onDateChange?: (date: string) => void;
  subtitle?: string;
  dateLabel?: string;
  maxDate?: string;
  minDate?: string;
}

export function MovieListItem({
  id,
  title,
  posterUrl,
  posterImageType,
  releaseDate,
  isOn,
  pendingDate,
  onToggle,
  onRevert,
  onDateChange,
  subtitle,
  dateLabel = 'Date',
  maxDate,
  minDate,
}: MovieListItemProps) {
  const hasPending = pendingDate !== undefined;

  function handleToggleClick() {
    if (hasPending) {
      onRevert();
    } else {
      onToggle(new Date().toISOString().split('T')[0]);
    }
  }

  return (
    <div
      className={`px-3 py-2.5 rounded-lg group ${hasPending ? 'bg-amber-500/5 ring-1 ring-amber-500/20' : 'hover:bg-surface-elevated'}`}
    >
      <div className="flex items-center gap-3">
        {/* Poster + edit icon overlay */}
        <Link href={`/movies/${id}`} className="relative shrink-0">
          {posterUrl ? (
            <img
              src={getImageUrl(posterUrl, 'sm', posterBucket(posterImageType)) ?? posterUrl}
              alt=""
              className="w-9 h-13 rounded object-cover"
            />
          ) : (
            <div className="w-9 h-13 rounded bg-input flex items-center justify-center">
              <Film className="w-3.5 h-3.5 text-on-surface-subtle" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Pencil className="w-3 h-3 text-white" />
          </div>
        </Link>

        {/* Title + release date + subtitle */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/movies/${id}`}
            className="text-sm font-medium text-on-surface hover:text-status-red transition-colors truncate block"
          >
            {title}
          </Link>
          {releaseDate && (
            <p className="text-xs text-on-surface-muted mt-0.5">{formatDate(releaseDate)}</p>
          )}
          {subtitle && <p className="text-xs text-status-blue mt-0.5">{subtitle}</p>}
        </div>

        {/* Pending date — shown inline between title and toggle */}
        {hasPending && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-status-amber">{dateLabel}</span>
            <input
              type="date"
              value={pendingDate}
              onChange={(e) => onDateChange?.(e.target.value)}
              max={maxDate}
              min={minDate}
              className="bg-input rounded-md px-1.5 py-0.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-red-600 w-[120px]"
            />
          </div>
        )}

        {/* Toggle */}
        <ToggleSwitch on={isOn} onChange={handleToggleClick} />
      </div>
    </div>
  );
}
