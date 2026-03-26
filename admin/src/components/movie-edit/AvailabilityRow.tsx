'use client';
import { Film, X, ExternalLink } from 'lucide-react';
import type { MoviePlatformAvailability } from '@shared/types';
import { getImageUrl } from '@shared/imageUrl';
import { colors } from '@shared/colors';

// @contract single platform availability row with logo, dates, streaming URL, and remove action
// @nullable platform relation may not be joined — falls back to platform_id
export interface AvailabilityRowProps {
  row: MoviePlatformAvailability;
  isPending: boolean;
  onRemove: (id: string) => void;
  isReadOnly: boolean;
}

export function AvailabilityRow({ row, isPending, onRemove, isReadOnly }: AvailabilityRowProps) {
  return (
    <div
      className={`flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3${isPending ? ' ring-1 ring-amber-500/40' : ''}`}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
        style={{ backgroundColor: row.platform?.color || colors.zinc900 }}
      >
        {row.platform?.logo_url ? (
          <img
            src={getImageUrl(row.platform.logo_url, 'sm', 'PLATFORMS') ?? row.platform.logo_url}
            alt=""
            className="w-6 h-6 object-contain"
          />
        ) : (
          <Film className="w-5 h-5 text-on-surface-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-on-surface font-medium">{row.platform?.name ?? row.platform_id}</span>
        {row.available_from && (
          <span className="text-on-surface-subtle text-sm ml-2">from {row.available_from}</span>
        )}
        {row.streaming_url && (
          <a
            href={row.streaming_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-status-blue hover:underline mt-0.5 truncate"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{row.streaming_url}</span>
          </a>
        )}
      </div>
      {!isReadOnly && (
        <button
          onClick={() => onRemove(row.id)}
          className="p-1.5 text-on-surface-subtle hover:text-status-red transition-colors"
          aria-label={`Remove ${row.platform?.name}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
