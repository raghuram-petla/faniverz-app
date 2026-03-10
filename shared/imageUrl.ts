export type ImageSize = 'sm' | 'md' | 'lg' | 'original';

/** Known external CDNs that don't have pre-generated _sm/_md/_lg variants. */
const EXTERNAL_CDNS = ['image.tmdb.org', 'i.pravatar.cc'];

export function getImageUrl(
  originalUrl: string | null,
  size: ImageSize = 'original',
): string | null {
  if (!originalUrl) return null;
  if (size === 'original') return originalUrl;
  // Skip variant suffix for external CDN URLs — only our storage (R2 / MinIO) has variants
  if (EXTERNAL_CDNS.some((cdn) => originalUrl.includes(cdn))) return originalUrl;
  return originalUrl.replace(/\.(\w+)$/, `_${size}.$1`);
}
