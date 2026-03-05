/**
 * R2 upload helper for sync operations.
 * Downloads images from external URLs (TMDB CDN) and uploads to R2 with variants.
 * Server-side only.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

const R2_PUBLIC_URLS: Record<string, string | undefined> = {
  'faniverz-movie-posters': process.env.R2_PUBLIC_BASE_URL_POSTERS,
  'faniverz-movie-backdrops': process.env.R2_PUBLIC_BASE_URL_BACKDROPS,
  'faniverz-actor-photos': process.env.R2_PUBLIC_BASE_URL_ACTORS,
};

function getR2Client(): S3Client | null {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

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
 * Falls back to returning sourceUrl when R2 credentials are not configured.
 *
 * @param sourceUrl  URL to fetch the image from (e.g. TMDB CDN)
 * @param bucket     R2 bucket name (use R2_BUCKETS constants)
 * @param key        Object key, e.g. "{uuid}.jpg"
 * @returns          Public R2 URL, or sourceUrl if R2 is not configured
 */
async function uploadImageFromUrl(sourceUrl: string, bucket: string, key: string): Promise<string> {
  const r2 = getR2Client();
  if (!r2) return sourceUrl;

  const response = await fetch(sourceUrl);
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

  // Upload original + variants in parallel
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

  const base = R2_PUBLIC_URLS[bucket];
  if (!base) {
    console.warn(`No public URL configured for R2 bucket: ${bucket}`);
    return sourceUrl;
  }
  return `${base.replace(/\/$/, '')}/${key}`;
}

/**
 * Upload image from URL if path is not null.
 * Convenience wrapper that handles null paths.
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
