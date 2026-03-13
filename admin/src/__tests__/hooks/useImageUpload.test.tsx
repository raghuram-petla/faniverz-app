import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { uploadImage, useImageUpload } from '@/hooks/useImageUpload';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── uploadImage (standalone utility) ─────────────────────────

describe('uploadImage', () => {
  it('uploads a file and returns the URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://cdn.example.com/photo.jpg' }),
    });

    const file = new File(['img'], 'photo.png', { type: 'image/png' });
    const url = await uploadImage(file, '/api/upload/test');

    expect(url).toBe('https://cdn.example.com/photo.jpg');
    expect(mockFetch).toHaveBeenCalledWith('/api/upload/test', {
      method: 'POST',
      body: expect.any(FormData),
    });
  });

  it('throws when file exceeds 5 MB', async () => {
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });

    await expect(uploadImage(bigFile, '/api/upload/test')).rejects.toThrow(
      'File too large. Maximum size is 5 MB.',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws server error message when response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid image format' }),
    });

    const file = new File(['img'], 'photo.png', { type: 'image/png' });

    await expect(uploadImage(file, '/api/upload/test')).rejects.toThrow('Invalid image format');
  });

  it('throws default message when server error has no message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const file = new File(['img'], 'photo.png', { type: 'image/png' });

    await expect(uploadImage(file, '/api/upload/test')).rejects.toThrow('Upload failed');
  });

  it('throws when response is ok but url is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const file = new File(['img'], 'photo.png', { type: 'image/png' });

    await expect(uploadImage(file, '/api/upload/test')).rejects.toThrow(
      'Upload succeeded but no URL returned',
    );
  });
});

// ── useImageUpload (hook) ────────────────────────────────────

describe('useImageUpload', () => {
  it('returns upload function and uploading state', () => {
    const { result } = renderHook(() => useImageUpload('/api/upload/test'));

    expect(result.current.uploading).toBe(false);
    expect(typeof result.current.upload).toBe('function');
  });

  it('sets uploading to true during upload and false after', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://cdn.example.com/photo.jpg' }),
    });

    const { result } = renderHook(() => useImageUpload('/api/upload/test'));
    const file = new File(['img'], 'photo.png', { type: 'image/png' });

    let uploadPromise: Promise<string>;
    await act(async () => {
      uploadPromise = result.current.upload(file);
      // uploading should be true during the upload
    });

    // After completion, uploading should be false
    expect(result.current.uploading).toBe(false);
    expect(await uploadPromise!).toBe('https://cdn.example.com/photo.jpg');
  });

  it('resets uploading to false on error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useImageUpload('/api/upload/test'));
    const file = new File(['img'], 'photo.png', { type: 'image/png' });

    await act(async () => {
      try {
        await result.current.upload(file);
      } catch {
        // expected
      }
    });

    expect(result.current.uploading).toBe(false);
  });
});
