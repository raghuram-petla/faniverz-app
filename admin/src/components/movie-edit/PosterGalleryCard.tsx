'use client';
import { Star, Calendar, X } from 'lucide-react';

// @contract reusable subheading with icon + uppercase label + bottom border + optional action slot
export function SectionHeading({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-outline-subtle">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-on-surface-muted" />
        <h3 className="text-sm font-semibold text-on-surface-muted uppercase tracking-wide">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

// @contract card row for a single poster — always-visible info (no hover needed)
export function PosterGalleryCard({
  poster,
  onSetMain,
  onRemove,
}: {
  poster: {
    id: string;
    image_url: string;
    title: string;
    poster_date?: string | null;
    is_main: boolean;
  };
  onSetMain: (id: string) => void;
  onRemove: (id: string, isPending: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3">
      <img
        src={poster.image_url}
        alt={poster.title}
        className="w-12 h-[72px] rounded-lg object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-on-surface font-medium text-sm truncate">{poster.title}</p>
          {poster.is_main && (
            <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-xs font-bold shrink-0">
              <Star className="w-3 h-3" /> Main
            </span>
          )}
        </div>
        {poster.poster_date && (
          <p className="text-xs text-on-surface-subtle mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {poster.poster_date}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!poster.is_main && (
          <button
            onClick={() => onSetMain(poster.id)}
            className="text-xs bg-yellow-500/10 text-yellow-500 px-2.5 py-1.5 rounded-lg font-medium hover:bg-yellow-500/20"
          >
            Set Main
          </button>
        )}
        <button
          onClick={() => onRemove(poster.id, poster.id.startsWith('pending-poster'))}
          className="p-1.5 rounded-lg text-on-surface-subtle hover:bg-red-600/10 hover:text-status-red"
          aria-label={`Remove ${poster.title}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
