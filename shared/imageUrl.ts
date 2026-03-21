export type ImageSize = 'sm' | 'md' | 'lg' | 'original';

/**
 * Identifies which R2/MinIO bucket a relative image key belongs to.
 * Used to reconstruct the full URL from environment variables at display time.
 */
export type ImageBucket =
  | 'POSTERS'
  | 'BACKDROPS'
  | 'ACTORS'
  | 'AVATARS'
  | 'PLATFORMS'
  | 'PRODUCTION_HOUSES';

/** Known external CDNs that don't have pre-generated _sm/_md/_lg variants. */
const EXTERNAL_CDNS = ['image.tmdb.org', 'i.pravatar.cc'];

// @contract: each bundle inlines its own env vars at build time.
// Expo uses EXPO_PUBLIC_R2_BASE_URL_*; Next.js exposes R2_PUBLIC_BASE_URL_* via next.config env.
// @coupling: Next.js vars must be listed in admin/next.config.ts env block.
// @contract: reads process.env at call time (not module init) so tests can inject env vars.
function getBaseUrl(bucket: ImageBucket): string | undefined {
  switch (bucket) {
    case 'POSTERS':
      return process.env.EXPO_PUBLIC_R2_BASE_URL_POSTERS ?? process.env.R2_PUBLIC_BASE_URL_POSTERS;
    case 'BACKDROPS':
      return (
        process.env.EXPO_PUBLIC_R2_BASE_URL_BACKDROPS ?? process.env.R2_PUBLIC_BASE_URL_BACKDROPS
      );
    case 'ACTORS':
      return process.env.EXPO_PUBLIC_R2_BASE_URL_ACTORS ?? process.env.R2_PUBLIC_BASE_URL_ACTORS;
    case 'AVATARS':
      return process.env.EXPO_PUBLIC_R2_BASE_URL_AVATARS ?? process.env.R2_PUBLIC_BASE_URL_AVATARS;
    case 'PLATFORMS':
      return (
        process.env.EXPO_PUBLIC_R2_BASE_URL_PLATFORMS ?? process.env.R2_PUBLIC_BASE_URL_PLATFORMS
      );
    case 'PRODUCTION_HOUSES':
      return (
        process.env.EXPO_PUBLIC_R2_BASE_URL_PRODUCTION_HOUSES ??
        process.env.R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES
      );
    default:
      // @invariant: all ImageBucket values must be handled above — this line is unreachable
      bucket satisfies never;
      return undefined;
  }
}

/**
 * Maps a feed entity type to its corresponding image bucket.
 * Used when a single image field can belong to multiple entity types
 * (e.g. EnrichedFollow.image_url, FeedAvatar).
 */
export function entityTypeToBucket(
  entityType: 'movie' | 'actor' | 'production_house' | 'user',
): ImageBucket {
  switch (entityType) {
    case 'movie':
      return 'POSTERS';
    case 'actor':
      return 'ACTORS';
    case 'production_house':
      return 'PRODUCTION_HOUSES';
    case 'user':
      return 'AVATARS';
  }
}

/**
 * Resolves an image URL for display, appending a size-variant suffix where applicable.
 *
 * - Full URLs (starting with "http"): returned as-is for external CDNs, or with the
 *   size suffix inserted before the extension for R2/MinIO URLs.
 * - Relative keys (e.g. "abc123.jpg"): the base URL is looked up from `bucket` via
 *   environment variables, then the size suffix is appended.
 *
 * @param originalUrl  Value stored in the DB — either a full URL or a relative key.
 * @param size         Requested variant. Defaults to 'original'.
 * @param bucket       Required when `originalUrl` is a relative key; identifies which
 *                     R2/MinIO bucket to pull the base URL from.
 * @returns            Full display URL, or null if inputs are null/insufficient.
 */
export function getImageUrl(
  originalUrl: string | null,
  size: ImageSize = 'original',
  bucket?: ImageBucket,
): string | null {
  if (!originalUrl) return null;

  // Full URL: external CDN or pre-migration URL still stored as full URL
  if (originalUrl.startsWith('http')) {
    if (size === 'original') return originalUrl;
    // External CDNs don't have pre-generated variants — return as-is
    if (EXTERNAL_CDNS.some((cdn) => originalUrl.includes(cdn))) return originalUrl;
    // R2/MinIO full URL (backward compat) — insert size suffix before extension
    return originalUrl.replace(/\.(\w+)$/, `_${size}.$1`) || originalUrl;
  }

  // Relative key — reconstruct full URL from bucket's base URL env var
  if (!bucket) return null;
  const baseUrl = getBaseUrl(bucket);
  if (!baseUrl) return null;
  const full = `${baseUrl.replace(/\/$/, '')}/${originalUrl}`;
  if (size === 'original') return full;
  return full.replace(/\.(\w+)$/, `_${size}.$1`) || full;
}

/** @contract resolves poster bucket from the movie's poster_image_type field */
export function posterBucket(imageType?: string | null): ImageBucket {
  return imageType === 'backdrop' ? 'BACKDROPS' : 'POSTERS';
}

/** @contract resolves backdrop bucket from the movie's backdrop_image_type field */
export function backdropBucket(imageType?: string | null): ImageBucket {
  return imageType === 'poster' ? 'POSTERS' : 'BACKDROPS';
}
