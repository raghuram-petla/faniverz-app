import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { generateVariants, type ImageVariant } from '@/lib/image-resize';
import { getR2Client } from '@/lib/r2-client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadConfig {
  bucket: string;
  variants: ImageVariant[];
  baseUrlEnvVar: string;
  label: string;
}

export function createUploadHandler(config: UploadConfig) {
  return async function POST(request: NextRequest) {
    try {
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

      if (!ALLOWED_TYPES.includes(file.type)) {
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

      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const id = randomUUID();
      const key = `${id}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const variants = await generateVariants(buffer, file.type, config.variants);

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
