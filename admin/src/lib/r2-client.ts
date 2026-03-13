import { S3Client } from '@aws-sdk/client-s3';

/**
 * Creates an S3-compatible client for R2 (production) or MinIO (local dev).
 *
 * - Set `R2_ENDPOINT` to a custom URL (e.g. `http://localhost:9000`) for MinIO.
 * - Without `R2_ENDPOINT`, constructs the Cloudflare R2 endpoint from `R2_ACCOUNT_ID`.
 *
 * Returns `null` when credentials are not configured.
 *
 * @coupling: used by upload-handler.ts for admin manual uploads. r2-sync.ts has its
 * own inline getR2Client() that does NOT support R2_ENDPOINT — so local dev with MinIO
 * works for manual uploads but NOT for TMDB sync image uploads. To test sync locally,
 * R2_ACCOUNT_ID must point to a real R2 account or the sync falls back to TMDB CDN URLs.
 * @edge: forcePathStyle is only enabled when R2_ENDPOINT is set. Without it, MinIO
 * requests fail because S3 virtual-hosted-style URLs don't resolve for localhost.
 */
export function getR2Client(): S3Client | null {
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) return null;

  const customEndpoint = process.env.R2_ENDPOINT;
  const endpoint =
    customEndpoint || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!customEndpoint,
  });
}
