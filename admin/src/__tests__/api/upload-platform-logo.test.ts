import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = mockSend;
  },
  PutObjectCommand: class {
    Bucket: string;
    Key: string;
    Body: unknown;
    ContentType: string;
    constructor(opts: { Bucket: string; Key: string; Body: unknown; ContentType: string }) {
      this.Bucket = opts.Bucket;
      this.Key = opts.Key;
      this.Body = opts.Body;
      this.ContentType = opts.ContentType;
    }
  },
}));

vi.mock('@/lib/image-resize', () => ({
  generateVariants: vi.fn(() =>
    Promise.resolve([
      { suffix: '_sm', buffer: Buffer.from('sm'), contentType: 'image/png' },
      { suffix: '_md', buffer: Buffer.from('md'), contentType: 'image/png' },
      { suffix: '_lg', buffer: Buffer.from('lg'), contentType: 'image/png' },
    ]),
  ),
  PHOTO_VARIANTS: [
    { suffix: '_sm', width: 100, quality: 80 },
    { suffix: '_md', width: 200, quality: 85 },
    { suffix: '_lg', width: 400, quality: 90 },
  ],
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      async json() {
        return body;
      },
    }),
  },
}));

function makeFormData(file?: File): FormData {
  const fd = new FormData();
  if (file) fd.append('file', file);
  return fd;
}

function makeRequest(formData: FormData) {
  return { formData: () => Promise.resolve(formData) } as never;
}

// Import after mocks are set up
import { POST } from '@/app/api/upload/platform-logo/route';

describe('POST /api/upload/platform-logo', () => {
  beforeEach(() => {
    mockSend.mockReset();
    vi.unstubAllEnvs();
  });

  it('returns 503 when R2 is not configured', async () => {
    vi.stubEnv('R2_ACCOUNT_ID', '');
    vi.stubEnv('R2_ACCESS_KEY_ID', '');

    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain('R2 storage is not configured');
  });

  it('returns 400 when no file provided', async () => {
    vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');

    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('No file provided');
  });

  it('returns 400 for invalid file type', async () => {
    vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');

    const file = new File(['test'], 'test.gif', { type: 'image/gif' });
    const res = await POST(makeRequest(makeFormData(file)));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid file type');
  });

  it('returns 400 for files over 5 MB', async () => {
    vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');

    const bigContent = new Uint8Array(6 * 1024 * 1024);
    const file = new File([bigContent], 'big.png', { type: 'image/png' });
    const res = await POST(makeRequest(makeFormData(file)));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('File too large');
  });

  it('returns 503 when R2_PUBLIC_BASE_URL_PLATFORMS is not set', async () => {
    vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
    vi.stubEnv('R2_PUBLIC_BASE_URL_PLATFORMS', '');

    mockSend.mockResolvedValue({});

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    const res = await POST(makeRequest(makeFormData(file)));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain('R2_PUBLIC_BASE_URL_PLATFORMS');
  });

  it('uploads original + 3 variants and returns URL on success', async () => {
    vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
    vi.stubEnv('R2_PUBLIC_BASE_URL_PLATFORMS', 'https://cdn.example.com/platforms');

    mockSend.mockResolvedValue({});

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    const res = await POST(makeRequest(makeFormData(file)));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.url).toMatch(/^https:\/\/cdn\.example\.com\/platforms\/[a-f0-9-]+\.png$/);

    // original + 3 variants = 4 uploads
    expect(mockSend).toHaveBeenCalledTimes(4);
  });

  it('uses correct bucket name', async () => {
    vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
    vi.stubEnv('R2_PUBLIC_BASE_URL_PLATFORMS', 'https://cdn.example.com/platforms');

    mockSend.mockResolvedValue({});

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    await POST(makeRequest(makeFormData(file)));

    const firstCall = mockSend.mock.calls[0][0] as { Bucket: string };
    expect(firstCall.Bucket).toBe('faniverz-platform-logos');
  });
});
