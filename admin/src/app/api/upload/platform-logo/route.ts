import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { generateVariants, PHOTO_VARIANTS } from '@/lib/image-resize';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BUCKET = 'faniverz-platform-logos';

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

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'File too large. Maximum size is 5 MB.' }, { status: 400 });
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const id = randomUUID();
    const key = `${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const variants = await generateVariants(buffer, file.type, PHOTO_VARIANTS);

    await Promise.all([
      r2.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        }),
      ),
      ...variants.map((v) =>
        r2.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: `${id}${v.suffix}.${ext}`,
            Body: v.buffer,
            ContentType: v.contentType,
          }),
        ),
      ),
    ]);

    const baseUrl = process.env.R2_PUBLIC_BASE_URL_PLATFORMS;
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'R2_PUBLIC_BASE_URL_PLATFORMS is not configured.' },
        { status: 503 },
      );
    }

    const url = `${baseUrl.replace(/\/$/, '')}/${key}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Platform logo upload failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
