'use client';
import { Calendar, X, Loader2 } from 'lucide-react';
import { getImageUrl } from '@shared/imageUrl';
import { useImageVariants } from '@/hooks/useImageVariants';

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

// @contract grid card for a single image (poster or backdrop) — image-first layout, 4 per row
// Main poster/backdrop selection is handled by MainImageSelector, not by this card
export interface PosterGalleryCardProps {
  poster: {
    id: string;
    image_url: string;
    title: string | null;
    image_type?: 'poster' | 'backdrop';
    poster_date?: string | null;
    is_main_poster: boolean;
    is_main_backdrop: boolean;
  };
  onRemove: (id: string, isPending: boolean) => void;
}

export function PosterGalleryCard({ poster, onRemove }: PosterGalleryCardProps) {
  // @contract cannot remove if it's the main poster or main backdrop
  const isAnyMain = poster.is_main_poster || poster.is_main_backdrop;
  const isBackdrop = poster.image_type === 'backdrop';
  const bucket = isBackdrop ? 'BACKDROPS' : 'POSTERS';
  const aspectClass = isBackdrop ? 'aspect-video' : 'aspect-[2/3]';

  return (
    <div className="bg-surface-elevated rounded-xl overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative">
        {/* v8 ignore start */}
        <img
          src={getImageUrl(poster.image_url, 'md', bucket) ?? poster.image_url}
          alt={poster.title || 'Image'}
          className={`w-full ${aspectClass} object-cover`}
        />
        {/* v8 ignore stop */}
        {/* @contract remove button overlaid on image top-right */}
        <button
          onClick={() => onRemove(poster.id, poster.id.startsWith('pending-poster'))}
          disabled={isAnyMain}
          title={isAnyMain ? 'Unset as main before removing' : undefined}
          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/50 text-white hover:bg-red-600/80 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black/50"
          aria-label={`Remove ${poster.title || 'image'}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Info + actions */}
      <div className="p-2 flex flex-col gap-1">
        <p className="text-on-surface font-medium text-xs truncate">{poster.title || 'Untitled'}</p>
        {poster.poster_date && (
          <p className="text-[10px] text-on-surface-subtle flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" /> {poster.poster_date}
          </p>
        )}
        {/* @contract compact variant status — colored dots per size */}
        <PosterVariantStatus imageUrl={poster.image_url} imageType={poster.image_type} />
      </div>
    </div>
  );
}

// @contract compact inline variant indicator — shows label + colored dot per variant size
const STATUS_COLOR: Record<string, string> = {
  ok: 'bg-green-500',
  missing: 'bg-red-500',
  error: 'bg-yellow-500',
};

export function PosterVariantStatus({
  imageUrl,
  imageType,
  bucket: bucketOverride,
  variantType: variantTypeOverride,
}: {
  imageUrl: string;
  imageType?: 'poster' | 'backdrop';
  bucket?: import('@shared/imageUrl').ImageBucket;
  variantType?: import('@shared/variant-config').VariantType;
}) {
  const variantType = variantTypeOverride ?? (imageType === 'backdrop' ? 'backdrop' : 'poster');
  const bucket = bucketOverride ?? (imageType === 'backdrop' ? 'BACKDROPS' : 'POSTERS');
  const { variants, isChecking } = useImageVariants(imageUrl, variantType, bucket);

  if (isChecking && variants.length === 0) {
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <Loader2 className="w-2.5 h-2.5 text-on-surface-muted animate-spin" />
        <span className="text-[9px] text-on-surface-muted">Checking...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap" data-testid="poster-variant-status">
      {variants.map((v) => (
        <span key={v.label} className="flex items-center gap-0.5" title={`${v.label}: ${v.status}`}>
          <span className="text-[9px] text-on-surface-muted">{v.label}</span>
          {/* v8 ignore start */}
          {v.status === 'checking' ? (
            <Loader2 className="w-2 h-2 text-on-surface-muted animate-spin" />
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[v.status] ?? 'bg-yellow-500'}`}
            />
          )}
          {/* v8 ignore stop */}
        </span>
      ))}
    </div>
  );
}
