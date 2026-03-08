import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();
const mockGetR2Client = vi.fn<() => { send: typeof mockSend } | null>(() => ({ send: mockSend }));

vi.mock('@/lib/r2-client', () => ({
  getR2Client: () => mockGetR2Client(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
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

import { createUploadHandler } from '@/lib/upload-handler';

const TEST_VARIANTS = [
  { suffix: '_sm', width: 100, quality: 80 },
  { suffix: '_md', width: 200, quality: 85 },
  { suffix: '_lg', width: 400, quality: 90 },
];

const TEST_CONFIG = {
  bucket: 'test-bucket',
  variants: TEST_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_TEST',
  label: 'Test image',
};

function makeFormData(file?: File): FormData {
  const fd = new FormData();
  if (file) fd.append('file', file);
  return fd;
}

function makeRequest(formData: FormData) {
  return { formData: () => Promise.resolve(formData) } as never;
}

describe('createUploadHandler', () => {
  const handler = createUploadHandler(TEST_CONFIG);

  beforeEach(() => {
    mockSend.mockReset();
    mockGetR2Client.mockReset();
    mockGetR2Client.mockReturnValue({ send: mockSend });
    vi.unstubAllEnvs();
  });

  it('returns 503 when R2 is not configured', async () => {
    mockGetR2Client.mockReturnValue(null);

    const res = await handler(makeRequest(makeFormData()));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain('R2 storage is not configured');
  });

  it('returns 400 when no file provided', async () => {
    const res = await handler(makeRequest(makeFormData()));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('No file provided');
  });

  it('returns 400 for invalid file type', async () => {
    const file = new File(['test'], 'test.gif', { type: 'image/gif' });
    const res = await handler(makeRequest(makeFormData(file)));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid file type');
  });

  it('returns 400 for files over 5 MB', async () => {
    const bigContent = new Uint8Array(6 * 1024 * 1024);
    const file = new File([bigContent], 'big.png', { type: 'image/png' });
    const res = await handler(makeRequest(makeFormData(file)));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('File too large');
  });

  it('returns 503 when base URL env var is not set', async () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL_TEST', '');
    mockSend.mockResolvedValue({});

    const file = new File(['img'], 'photo.png', { type: 'image/png' });
    const res = await handler(makeRequest(makeFormData(file)));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain('R2_PUBLIC_BASE_URL_TEST');
  });

  it('uploads original + 3 variants and returns URL on success', async () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL_TEST', 'https://cdn.example.com/test');
    mockSend.mockResolvedValue({});

    const file = new File(['img'], 'photo.png', { type: 'image/png' });
    const res = await handler(makeRequest(makeFormData(file)));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.url).toMatch(/^https:\/\/cdn\.example\.com\/test\/[a-f0-9-]+\.png$/);

    // original + 3 variants = 4 uploads
    expect(mockSend).toHaveBeenCalledTimes(4);
  });

  it('uses the configured bucket name', async () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL_TEST', 'https://cdn.example.com/test');
    mockSend.mockResolvedValue({});

    const file = new File(['img'], 'photo.png', { type: 'image/png' });
    await handler(makeRequest(makeFormData(file)));

    const firstCall = mockSend.mock.calls[0][0] as { Bucket: string };
    expect(firstCall.Bucket).toBe('test-bucket');
  });

  it('strips trailing slash from base URL', async () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL_TEST', 'https://cdn.example.com/test/');
    mockSend.mockResolvedValue({});

    const file = new File(['img'], 'photo.png', { type: 'image/png' });
    const res = await handler(makeRequest(makeFormData(file)));
    const data = await res.json();
    expect(data.url).not.toContain('test//');
    expect(data.url).toMatch(/\/test\/[a-f0-9-]+\.png$/);
  });

  it('determines correct extension for each file type', async () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL_TEST', 'https://cdn.example.com/test');
    mockSend.mockResolvedValue({});

    const jpegFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    const jpegRes = await handler(makeRequest(makeFormData(jpegFile)));
    const jpegData = await jpegRes.json();
    expect(jpegData.url).toMatch(/\.jpg$/);

    mockSend.mockReset();

    const webpFile = new File(['img'], 'photo.webp', { type: 'image/webp' });
    const webpRes = await handler(makeRequest(makeFormData(webpFile)));
    const webpData = await webpRes.json();
    expect(webpData.url).toMatch(/\.webp$/);
  });
});
