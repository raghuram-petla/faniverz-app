import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockToBuffer, mockFormat, mockResize } = vi.hoisted(() => {
  const mockToBuffer = vi.fn().mockResolvedValue(Buffer.from('resized'));
  const mockFormat = vi.fn().mockReturnValue({ toBuffer: mockToBuffer });
  const mockResize = vi.fn().mockReturnValue({
    jpeg: mockFormat,
    png: mockFormat,
    webp: mockFormat,
  });
  return { mockToBuffer, mockFormat, mockResize };
});

vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue({ resize: mockResize }),
}));

import sharp from 'sharp';
import {
  generateVariants,
  POSTER_VARIANTS,
  BACKDROP_VARIANTS,
  PHOTO_VARIANTS,
} from '@/lib/image-resize';

describe('POSTER_VARIANTS', () => {
  it('has 3 entries with correct suffixes (_sm, _md, _lg)', () => {
    expect(POSTER_VARIANTS).toHaveLength(3);
    expect(POSTER_VARIANTS.map((v) => v.suffix)).toEqual(['_sm', '_md', '_lg']);
  });

  it('has widths 200, 400, 800', () => {
    expect(POSTER_VARIANTS.map((v) => v.width)).toEqual([200, 400, 800]);
  });
});

describe('BACKDROP_VARIANTS', () => {
  it('has 3 entries with correct suffixes (_sm, _md, _lg)', () => {
    expect(BACKDROP_VARIANTS).toHaveLength(3);
    expect(BACKDROP_VARIANTS.map((v) => v.suffix)).toEqual(['_sm', '_md', '_lg']);
  });

  it('has widths 480, 960, 1920', () => {
    expect(BACKDROP_VARIANTS.map((v) => v.width)).toEqual([480, 960, 1920]);
  });
});

describe('PHOTO_VARIANTS', () => {
  it('has 3 entries with correct suffixes (_sm, _md, _lg)', () => {
    expect(PHOTO_VARIANTS).toHaveLength(3);
    expect(PHOTO_VARIANTS.map((v) => v.suffix)).toEqual(['_sm', '_md', '_lg']);
  });

  it('has widths 100, 200, 400', () => {
    expect(PHOTO_VARIANTS.map((v) => v.width)).toEqual([100, 200, 400]);
  });
});

describe('generateVariants', () => {
  const inputBuffer = Buffer.from('test-image');

  beforeEach(() => {
    vi.clearAllMocks();
    mockToBuffer.mockResolvedValue(Buffer.from('resized'));
    mockFormat.mockReturnValue({ toBuffer: mockToBuffer });
    mockResize.mockReturnValue({ jpeg: mockFormat, png: mockFormat, webp: mockFormat });
    (sharp as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ resize: mockResize });
  });

  it('returns correct number of results for POSTER_VARIANTS', async () => {
    const results = await generateVariants(inputBuffer, 'image/jpeg', POSTER_VARIANTS);
    expect(results).toHaveLength(3);
  });

  it('uses jpeg format for image/jpeg content type', async () => {
    await generateVariants(inputBuffer, 'image/jpeg', POSTER_VARIANTS);
    expect(mockFormat).toHaveBeenCalled();
    expect(mockFormat).toHaveBeenCalledWith({ quality: 80 });
  });

  it('uses png format for image/png content type', async () => {
    await generateVariants(inputBuffer, 'image/png', POSTER_VARIANTS);
    expect(mockFormat).toHaveBeenCalled();
    expect(mockFormat).toHaveBeenCalledWith({ quality: 80 });
  });

  it('uses webp format for image/webp content type', async () => {
    await generateVariants(inputBuffer, 'image/webp', POSTER_VARIANTS);
    expect(mockFormat).toHaveBeenCalled();
    expect(mockFormat).toHaveBeenCalledWith({ quality: 80 });
  });

  it('preserves suffix in each result', async () => {
    const results = await generateVariants(inputBuffer, 'image/jpeg', POSTER_VARIANTS);
    expect(results.map((r) => r.suffix)).toEqual(['_sm', '_md', '_lg']);
  });

  it('preserves contentType in each result', async () => {
    const results = await generateVariants(inputBuffer, 'image/jpeg', POSTER_VARIANTS);
    results.forEach((r) => {
      expect(r.contentType).toBe('image/jpeg');
    });
  });

  it('calls sharp.resize with correct params (fit: inside, withoutEnlargement: true)', async () => {
    await generateVariants(inputBuffer, 'image/jpeg', POSTER_VARIANTS);

    expect(mockResize).toHaveBeenCalledTimes(3);
    expect(mockResize).toHaveBeenCalledWith(200, undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    });
    expect(mockResize).toHaveBeenCalledWith(400, undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    });
    expect(mockResize).toHaveBeenCalledWith(800, undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  });

  it('passes quality to the format method', async () => {
    await generateVariants(inputBuffer, 'image/jpeg', POSTER_VARIANTS);

    expect(mockFormat).toHaveBeenCalledTimes(3);
    expect(mockFormat).toHaveBeenCalledWith({ quality: 80 });
    expect(mockFormat).toHaveBeenCalledWith({ quality: 85 });
    expect(mockFormat).toHaveBeenCalledWith({ quality: 90 });
  });
});
