'use client';
import { Star, Calendar, X } from 'lucide-react';
import { getImageUrl } from '@shared/imageUrl';

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

// @contract grid card for a single poster — image-first layout, 4 per row
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
    <div className="bg-surface-elevated rounded-xl overflow-hidden flex flex-col">
      {/* Poster image */}
      <div className="relative">
        <img
          src={getImageUrl(poster.image_url, 'md', 'POSTERS') ?? poster.image_url}
          alt={poster.title}
          className="w-full aspect-[2/3] object-cover"
        />
        {/* @contract main badge overlaid on image top-left */}
        {poster.is_main && (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-yellow-500/90 text-black px-1.5 py-0.5 rounded text-[10px] font-bold">
            <Star className="w-2.5 h-2.5" /> Main
          </span>
        )}
        {/* @contract remove button overlaid on image top-right */}
        <button
          onClick={() => onRemove(poster.id, poster.id.startsWith('pending-poster'))}
          disabled={poster.is_main}
          title={poster.is_main ? 'Set another poster as main before removing this one' : undefined}
          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/50 text-white hover:bg-red-600/80 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black/50"
          aria-label={`Remove ${poster.title}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Info + actions */}
      <div className="p-2 flex flex-col gap-1">
        <p className="text-on-surface font-medium text-xs truncate">{poster.title}</p>
        {poster.poster_date && (
          <p className="text-[10px] text-on-surface-subtle flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" /> {poster.poster_date}
          </p>
        )}
        {!poster.is_main && (
          <button
            onClick={() => onSetMain(poster.id)}
            className="mt-0.5 w-full text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-1 rounded font-medium hover:bg-yellow-500/20"
          >
            Set Main
          </button>
        )}
      </div>
    </div>
  );
}
