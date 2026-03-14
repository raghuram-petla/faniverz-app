import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { generateVariants, type ImageVariant } from '@/lib/image-resize';
import { getR2Client } from '@/lib/r2-client';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/upload-config';
import { verifyAdminWithRole } from '@/lib/sync-helpers';

export interface UploadConfig {
  bucket: string;
  variants: ImageVariant[];
  baseUrlEnvVar: string;
  label: string;
}

// @contract: factory that creates a Next.js POST route handler for a specific R2 bucket.
// Each upload endpoint (posters, backdrops, actors, avatars) calls this with its own config.
// @coupling: uses r2-client.ts getR2Client (NOT the inline getR2Client in r2-sync.ts) —
// this one supports R2_ENDPOINT for local MinIO dev, while r2-sync.ts does not.
export function createUploadHandler(config: UploadConfig) {
  return async function POST(request: NextRequest) {
    try {
      const adminResult = await verifyAdminWithRole(request.headers.get('authorization'));
      if (!adminResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // @contract: ph_admin can only upload to production_house-scoped buckets
      if (adminResult.role === 'production_house_admin' && !config.bucket.includes('production')) {
        return NextResponse.json(
          { error: 'Insufficient permissions for this upload type' },
          { status: 403 },
        );
      }

      const r2 = getR2Client();
      if (!r2) {
        return NextResponse.json(
          { error: 'R2 storage is not configured. Add R2 credentials to .env.local.' },
          { status: 503 },
        );
      }

      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
        return NextResponse.json(
          { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 5 MB.' },
          { status: 400 },
        );
      }

      // @coupling: key format is `{uuid}.{ext}` — different from r2-sync.ts which uses
      // `{tmdbId}.{ext}`. Manual admin uploads use UUIDs so they never collide with
      // TMDB-synced images. However, if an admin manually uploads a poster and then
      // re-syncs the movie from TMDB, the TMDB sync overwrites poster_url in the DB
      // with the tmdbId-keyed URL, orphaning the UUID-keyed upload in R2 permanently.
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const id = randomUUID();
      const key = `${id}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const variants = await generateVariants(buffer, file.type, config.variants);

      // @sideeffect: uploads original + variants in parallel. Same orphan risk as r2-sync.ts —
      // partial failure leaves some variants in R2 but returns 500 to the client, so the admin
      // sees "Upload failed" and retries with a new UUID, creating more orphans.
      // No cleanup of partial uploads is attempted.
      await Promise.all([
        r2.send(
          new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type,
          }),
        ),
        ...variants.map((v) =>
          r2.send(
            new PutObjectCommand({
              Bucket: config.bucket,
              Key: `${id}${v.suffix}.${ext}`,
              Body: v.buffer,
              ContentType: v.contentType,
            }),
          ),
        ),
      ]);

      // @edge: the upload to R2 has already succeeded at this point — if baseUrlEnvVar
      // is not configured, the image exists in R2 but we return 503. The admin gets an
      // error and may retry, creating duplicate uploads. The already-uploaded image is
      // unreachable because no public URL can be constructed for it.
      const baseUrl = process.env[config.baseUrlEnvVar];
      if (!baseUrl) {
        return NextResponse.json(
          { error: `${config.baseUrlEnvVar} is not configured.` },
          { status: 503 },
        );
      }

      const url = `${baseUrl.replace(/\/$/, '')}/${key}`;
      return NextResponse.json({ url });
    } catch (err) {
      console.error(`${config.label} upload failed:`, err);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  };
}
