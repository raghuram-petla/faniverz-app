import { S3Client } from '@aws-sdk/client-s3';

/**
 * Creates an S3-compatible client for R2 (production) or MinIO (local dev).
 *
 * - Set `R2_ENDPOINT` to a custom URL (e.g. `http://localhost:9000`) for MinIO.
 * - Without `R2_ENDPOINT`, constructs the Cloudflare R2 endpoint from `R2_ACCOUNT_ID`.
 *
 * Returns `null` when credentials are not configured.
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
