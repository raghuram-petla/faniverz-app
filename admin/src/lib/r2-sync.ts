/**
 * R2 upload helper for sync operations.
 * Downloads images from external URLs (TMDB CDN) and uploads to R2 with variants.
 * Server-side only.
 *
 * @coupling: uses shared getR2Client() from r2-client.ts — same client used by
 * upload-handler.ts for manual uploads. Supports both Cloudflare R2 (production)
 * and MinIO (local dev via R2_ENDPOINT).
 */

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client } from './r2-client';
import {
  generateVariants,
  type ImageVariant,
  POSTER_VARIANTS,
  BACKDROP_VARIANTS,
  PHOTO_VARIANTS,
} from './image-resize';

export const R2_BUCKETS = {
  moviePosters: 'faniverz-movie-posters',
  movieBackdrops: 'faniverz-movie-backdrops',
  actorPhotos: 'faniverz-actor-photos',
} as const;

/** Get the variant specs for a given bucket. */
function getVariantsForBucket(bucket: string): ImageVariant[] {
  switch (bucket) {
    case R2_BUCKETS.moviePosters:
      return POSTER_VARIANTS;
    case R2_BUCKETS.movieBackdrops:
      return BACKDROP_VARIANTS;
    case R2_BUCKETS.actorPhotos:
      return PHOTO_VARIANTS;
    default:
      return PHOTO_VARIANTS;
  }
}

/**
 * Downloads an image from sourceUrl and uploads to R2 with resized variants.
 * Returns the relative key on success, or sourceUrl as-is when R2 is not configured
 * (so external CDN URLs like TMDB are stored in the DB and handled by getImageUrl's
 * external-URL pass-through path).
 *
 * @param sourceUrl  URL to fetch the image from (e.g. TMDB CDN)
 * @param bucket     R2 bucket name (use R2_BUCKETS constants)
 * @param key        Object key, e.g. "{tmdbId}.jpg"
 * @returns          Relative key (e.g. "12345.jpg"), or sourceUrl if R2 is not configured
 */
export async function uploadImageFromUrl(
  sourceUrl: string,
  bucket: string,
  key: string,
): Promise<string> {
  const r2 = getR2Client();
  // @edge: R2 not configured — return external URL (e.g. TMDB CDN) so caller stores a
  // usable full URL. getImageUrl recognises TMDB as an external CDN and returns it as-is.
  if (!r2) return sourceUrl;

  // @edge: 30s timeout prevents hung image downloads from exhausting file descriptors (EMFILE)
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    console.warn(`Failed to fetch image: ${sourceUrl} (${response.status})`);
    return sourceUrl;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';

  // Generate resized variants
  const variantSpecs = getVariantsForBucket(bucket);
  const variants = await generateVariants(buffer, contentType, variantSpecs);

  // Derive key parts for variant naming
  const dotIdx = key.lastIndexOf('.');
  const baseName = dotIdx > 0 ? key.slice(0, dotIdx) : key;
  const ext = dotIdx > 0 ? key.slice(dotIdx + 1) : 'jpg';

  // @sideeffect: uploads original + all resized variants in parallel. If one variant
  // upload fails (e.g. network blip), Promise.all rejects and the ENTIRE upload is
  // treated as failed — but the successful variants are already persisted in R2 as
  // orphans with no corresponding DB reference (the caller gets an error, falls back
  // to TMDB URL). Re-syncing the same movie re-uploads all variants, overwriting orphans.
  // @coupling: R2 key format is `{tmdbId}.jpg` for originals and `{tmdbId}_sm.jpg`,
  // `{tmdbId}_md.jpg`, `{tmdbId}_lg.jpg` for variants. The mobile app constructs
  // variant URLs by inserting the suffix before the extension — if this naming
  // convention changes, the mobile image component's URL rewriting breaks silently.
  await Promise.all([
    r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    ),
    ...variants.map((v) =>
      r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${baseName}${v.suffix}.${ext}`,
          Body: v.buffer,
          ContentType: v.contentType,
        }),
      ),
    ),
  ]);

  // @contract: returns only the relative key (e.g. "12345.jpg"), not a full URL.
  // The caller stores this key in the DB; base URLs are resolved at display time
  // via NEXT_PUBLIC_/EXPO_PUBLIC_ env vars so no IP is baked into the database.
  return key;
}

/**
 * Upload image from URL if path is not null.
 * Convenience wrapper that handles null paths.
 *
 * @contract: returns null for null tmdbPath (no upload attempted), a relative key (e.g.
 * "12345.jpg") on successful R2 upload, or the original TMDB CDN full URL as fallback
 * when R2 is not configured or the source fetch fails. Callers store whatever is returned
 * in the DB; getImageUrl handles both relative keys and full external URLs at display time.
 * @nullable: tmdbPath is null when TMDB has no image for the entity (e.g. actor
 * without a profile photo). The DB column stores null, and the mobile app renders
 * a placeholder via PLACEHOLDER_AVATAR / PLACEHOLDER_POSTER constants.
 */
export async function maybeUploadImage(
  tmdbPath: string | null,
  bucket: string,
  key: string,
  imageBaseUrl: (path: string) => string,
): Promise<string | null> {
  if (!tmdbPath) return null;
  const sourceUrl = imageBaseUrl(tmdbPath);
  return uploadImageFromUrl(sourceUrl, bucket, key);
}
