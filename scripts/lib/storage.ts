import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Three separate R2 buckets, each with their own public URL env var.
export const R2_BUCKETS = {
  moviePosters: 'faniverz-movie-posters',
  movieBackdrops: 'faniverz-movie-backdrops',
  actorPhotos: 'faniverz-actor-photos',
} as const;

// Each bucket has its own pub-xxxx.r2.dev domain when public access is enabled.
const R2_PUBLIC_URLS: Record<string, string | undefined> = {
  'faniverz-movie-posters': process.env.R2_PUBLIC_BASE_URL_POSTERS,
  'faniverz-movie-backdrops': process.env.R2_PUBLIC_BASE_URL_BACKDROPS,
  'faniverz-actor-photos': process.env.R2_PUBLIC_BASE_URL_ACTORS,
};

/** Returns null when R2 credentials are absent (local dev without creds). */
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

/**
 * Downloads an image from sourceUrl and uploads it to R2.
 * Falls back to returning the original sourceUrl when R2 credentials are
 * not configured — safe for local dev / running seed scripts without creds.
 *
 * @param sourceUrl  URL to fetch the image from (e.g. TMDB CDN)
 * @param bucket     R2 bucket name (use R2_BUCKETS constants)
 * @param key        Object key, e.g. "{uuid}.jpg"
 * @returns          Public R2 URL, or sourceUrl if R2 is not configured
 */
export async function uploadImageFromUrl(
  sourceUrl: string,
  bucket: string,
  key: string,
): Promise<string> {
  const r2 = getR2Client();
  if (!r2) return sourceUrl; // local dev fallback — store original URL

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    console.warn(`Failed to fetch image: ${sourceUrl} (${response.status})`);
    return sourceUrl;
  }
  const buffer = await response.arrayBuffer();

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: 'image/jpeg',
    }),
  );

  const base = R2_PUBLIC_URLS[bucket];
  if (!base) throw new Error(`No public URL configured for R2 bucket: ${bucket}`);
  return `${base.replace(/\/$/, '')}/${key}`;
}
