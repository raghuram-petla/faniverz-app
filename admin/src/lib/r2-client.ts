import { S3Client } from '@aws-sdk/client-s3';

/**
 * Creates an S3-compatible client for R2 (production) or MinIO (local dev).
 *
 * - Set `R2_ENDPOINT` to a custom URL (e.g. `http://localhost:9000`) for MinIO.
 * - Without `R2_ENDPOINT`, constructs the Cloudflare R2 endpoint from `R2_ACCOUNT_ID`.
 *
 * Returns `null` when credentials are not configured.
 *
 * @coupling: shared by upload-handler.ts (manual uploads) and r2-sync.ts (TMDB sync).
 * @edge: forcePathStyle is only enabled when R2_ENDPOINT is set. Without it, MinIO
 * requests fail because S3 virtual-hosted-style URLs don't resolve for localhost.
 */
// @invariant: singleton — reuse the same S3Client across all sync operations to avoid
// exhausting OS file descriptors (EMFILE) during bulk imports. Each S3Client maintains
// its own HTTP connection pool; creating one per upload caused 300+ open sockets per movie.
let cachedClient: S3Client | null | undefined;

export function getR2Client(): S3Client | null {
  if (cachedClient !== undefined) return cachedClient;

  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    cachedClient = null;
    return null;
  }

  const customEndpoint = process.env.R2_ENDPOINT;
  const endpoint =
    customEndpoint || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  cachedClient = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!customEndpoint,
  });
  return cachedClient;
}
