import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  },
}));

vi.mock('@/lib/upload-config', () => ({
  MAX_FILE_SIZE: 5 * 1024 * 1024,
}));

import { uploadImage, useImageUpload } from '@/hooks/useImageUpload';

describe('uploadImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
    global.fetch = vi.fn();
  });

  it('uploads file and returns URL', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://cdn/image.jpg' }),
    } as Response);

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    const result = await uploadImage(file, '/api/upload');
    expect(result).toBe('https://cdn/image.jpg');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok123' }),
      }),
    );
  });

  it('throws when file is too large', async () => {
    const file = new File(['data'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

    await expect(uploadImage(file, '/api/upload')).rejects.toThrow('File too large');
  });

  it('throws when response is not ok', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Bad request' }),
    } as Response);

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    await expect(uploadImage(file, '/api/upload')).rejects.toThrow('Bad request');
  });

  it('throws fallback message when error key is missing from response', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    await expect(uploadImage(file, '/api/upload')).rejects.toThrow('Upload failed');
  });

  it('throws when upload succeeds but no URL returned', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    await expect(uploadImage(file, '/api/upload')).rejects.toThrow('no URL returned');
  });

  it('does not add Authorization header when session has no token', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://cdn/image.jpg' }),
    } as Response);

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    await uploadImage(file, '/api/upload');

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });
});

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
    global.fetch = vi.fn();
  });

  it('returns upload function and uploading state', () => {
    const { result } = renderHook(() => useImageUpload('/api/upload'));
    expect(result.current.uploading).toBe(false);
    expect(typeof result.current.upload).toBe('function');
  });

  it('sets uploading to true during upload and resets after', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://cdn/image.jpg' }),
    } as Response);

    const { result } = renderHook(() => useImageUpload('/api/upload'));

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    await act(async () => {
      const url = await result.current.upload(file);
      expect(url).toBe('https://cdn/image.jpg');
    });

    expect(result.current.uploading).toBe(false);
  });

  it('resets uploading even when upload fails', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed' }),
    } as Response);

    const { result } = renderHook(() => useImageUpload('/api/upload'));

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

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
