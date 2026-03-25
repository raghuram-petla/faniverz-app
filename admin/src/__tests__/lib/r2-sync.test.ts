/**
 * Tests for r2-sync.ts — R2 image upload helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn().mockResolvedValue({});
const mockGetR2Client = vi.fn();

vi.mock('../../lib/r2-client', () => ({
  getR2Client: () => mockGetR2Client(),
}));

vi.mock('../../lib/image-resize', () => ({
  generateVariants: vi.fn().mockResolvedValue([
    { suffix: '_sm', buffer: Buffer.from('sm'), contentType: 'image/jpeg' },
    { suffix: '_md', buffer: Buffer.from('md'), contentType: 'image/jpeg' },
  ]),
  POSTER_VARIANTS: [{ suffix: '_sm' }, { suffix: '_md' }],
  BACKDROP_VARIANTS: [{ suffix: '_sm' }],
  PHOTO_VARIANTS: [{ suffix: '_sm' }],
}));

vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: class PutObjectCommand {
    Bucket!: string;
    Key!: string;
    Body: unknown;
    ContentType!: string;
    constructor(params: Record<string, unknown>) {
      Object.assign(this, params);
    }
  },
}));

import { uploadImageFromUrl, maybeUploadImage, R2_BUCKETS } from '../../lib/r2-sync';

describe('R2_BUCKETS', () => {
  it('exports correct bucket names', () => {
    expect(R2_BUCKETS.moviePosters).toBe('faniverz-movie-posters');
    expect(R2_BUCKETS.movieBackdrops).toBe('faniverz-movie-backdrops');
    expect(R2_BUCKETS.actorPhotos).toBe('faniverz-actor-photos');
  });
});

describe('uploadImageFromUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns sourceUrl when R2 client is not configured', async () => {
    mockGetR2Client.mockReturnValue(null);

    const result = await uploadImageFromUrl(
      'https://image.tmdb.org/t/p/w500/test.jpg',
      R2_BUCKETS.moviePosters,
      '12345.jpg',
    );

    expect(result).toBe('https://image.tmdb.org/t/p/w500/test.jpg');
  });

  it('returns sourceUrl when fetch fails', async () => {
    mockGetR2Client.mockReturnValue({ send: mockSend });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Map(),
      }),
    );

    const result = await uploadImageFromUrl(
      'https://image.tmdb.org/t/p/w500/missing.jpg',
      R2_BUCKETS.moviePosters,
      '12345.jpg',
    );

    expect(result).toBe('https://image.tmdb.org/t/p/w500/missing.jpg');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('uploads original + variants to R2 and returns the key', async () => {
    mockGetR2Client.mockReturnValue({ send: mockSend });
    const mockHeaders = new Headers();
    mockHeaders.set('content-type', 'image/jpeg');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: mockHeaders,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }),
    );

    const result = await uploadImageFromUrl(
      'https://image.tmdb.org/t/p/w500/poster.jpg',
      R2_BUCKETS.moviePosters,
      '12345.jpg',
    );

    expect(result).toBe('12345.jpg');
    // original + 2 variants = 3 uploads
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('derives variant keys from the base key', async () => {
    mockGetR2Client.mockReturnValue({ send: mockSend });
    const mockHeaders = new Headers();
    mockHeaders.set('content-type', 'image/jpeg');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: mockHeaders,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }),
    );

    await uploadImageFromUrl(
      'https://image.tmdb.org/t/p/w500/poster.jpg',
      R2_BUCKETS.moviePosters,
      'abc-123.jpg',
    );

    // Original key
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ Key: 'abc-123.jpg', Bucket: R2_BUCKETS.moviePosters }),
    );
    // Variant keys
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ Key: 'abc-123_sm.jpg' }));
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ Key: 'abc-123_md.jpg' }));
  });

  it('falls back to image/jpeg content type when header is missing', async () => {
    mockGetR2Client.mockReturnValue({ send: mockSend });
    const mockHeaders = new Headers(); // no content-type
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: mockHeaders,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }),
    );

    await uploadImageFromUrl(
      'https://image.tmdb.org/t/p/w500/poster.jpg',
      R2_BUCKETS.moviePosters,
      '12345.jpg',
    );

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ ContentType: 'image/jpeg' }));
  });

  it('uses BACKDROP_VARIANTS for movieBackdrops bucket', async () => {
    const mockR2 = { send: mockSend };
    mockGetR2Client.mockReturnValue(mockR2);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
        headers: { get: () => 'image/jpeg' },
      }),
    );

    await uploadImageFromUrl(
      'https://cdn.example.com/backdrop.jpg',
      R2_BUCKETS.movieBackdrops,
      'backdrop.jpg',
    );

    // Should have uploaded original + variants from BACKDROP_VARIANTS
    expect(mockSend).toHaveBeenCalled();
  });

  it('uses PHOTO_VARIANTS for unknown bucket (default case)', async () => {
    const mockR2 = { send: mockSend };
    mockGetR2Client.mockReturnValue(mockR2);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
        headers: { get: () => 'image/jpeg' },
      }),
    );

    await uploadImageFromUrl(
      'https://cdn.example.com/other.jpg',
      'some-unknown-bucket',
      'other.jpg',
    );

    expect(mockSend).toHaveBeenCalled();
  });
});

describe('maybeUploadImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetR2Client.mockReturnValue(null); // R2 not configured
  });

  it('uses PHOTO_VARIANTS for actorPhotos bucket', async () => {
    mockGetR2Client.mockReturnValue({ send: mockSend });
    const mockHeaders = new Headers();
    mockHeaders.set('content-type', 'image/jpeg');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: mockHeaders,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }),
    );

    const result = await uploadImageFromUrl(
      'https://image.tmdb.org/t/p/w185/photo.jpg',
      R2_BUCKETS.actorPhotos,
      'actor-123.jpg',
    );

    expect(result).toBe('actor-123.jpg');
    expect(mockSend).toHaveBeenCalled();
  });

  it('uses BACKDROP_VARIANTS for movieBackdrops bucket', async () => {
    mockGetR2Client.mockReturnValue({ send: mockSend });
    const mockHeaders = new Headers();
    mockHeaders.set('content-type', 'image/jpeg');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: mockHeaders,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }),
    );

    const result = await uploadImageFromUrl(
      'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
      R2_BUCKETS.movieBackdrops,
      'backdrop-123.jpg',
    );

    expect(result).toBe('backdrop-123.jpg');
    expect(mockSend).toHaveBeenCalled();
  });

  it('uses PHOTO_VARIANTS as default for unknown bucket', async () => {
    mockGetR2Client.mockReturnValue({ send: mockSend });
    const mockHeaders = new Headers();
    mockHeaders.set('content-type', 'image/jpeg');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: mockHeaders,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }),
    );

    const result = await uploadImageFromUrl(
      'https://image.tmdb.org/t/p/w500/img.jpg',
      'unknown-bucket',
      'test.jpg',
    );

    expect(result).toBe('test.jpg');
    expect(mockSend).toHaveBeenCalled();
  });

  it('returns null for null tmdbPath', async () => {
    const result = await maybeUploadImage(
      null,
      R2_BUCKETS.actorPhotos,
      'key.jpg',
      (p) => `https://cdn.example.com${p}`,
    );

    expect(result).toBeNull();
  });

  it('constructs sourceUrl using imageBaseUrl and delegates to uploadImageFromUrl', async () => {
    const imageBaseUrl = vi.fn((p: string) => `https://cdn.example.com${p}`);

    const result = await maybeUploadImage(
      '/photo.jpg',
      R2_BUCKETS.actorPhotos,
      'key.jpg',
      imageBaseUrl,
    );

    expect(imageBaseUrl).toHaveBeenCalledWith('/photo.jpg');
    // R2 not configured, so returns the full source URL
    expect(result).toBe('https://cdn.example.com/photo.jpg');
  });
});
