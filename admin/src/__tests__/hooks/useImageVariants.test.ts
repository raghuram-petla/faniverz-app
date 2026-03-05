import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useImageVariants } from '@/hooks/useImageVariants';

function mockCheckResponse(statuses: ('ok' | 'missing' | 'error')[]) {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({
      results: statuses.map((status, i) => ({
        url: `url-${i}`,
        status,
      })),
    }),
  });
}

describe('useImageVariants', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns empty variants when originalUrl is null', () => {
    const { result } = renderHook(() => useImageVariants(null, 'poster'));
    expect(result.current.variants).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.readyCount).toBe(0);
  });

  it('derives 4 variant URLs from the original URL', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        results: [
          { url: 'https://r2.dev/abc.jpg', status: 'ok' },
          { url: 'https://r2.dev/abc_sm.jpg', status: 'ok' },
          { url: 'https://r2.dev/abc_md.jpg', status: 'ok' },
          { url: 'https://r2.dev/abc_lg.jpg', status: 'ok' },
        ],
      }),
    });

    const { result } = renderHook(() => useImageVariants('https://r2.dev/abc.jpg', 'poster'));

    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(result.current.variants).toHaveLength(4);
    expect(result.current.variants[0].url).toBe('https://r2.dev/abc.jpg');
    expect(result.current.variants[1].url).toBe('https://r2.dev/abc_sm.jpg');
    expect(result.current.variants[2].url).toBe('https://r2.dev/abc_md.jpg');
    expect(result.current.variants[3].url).toBe('https://r2.dev/abc_lg.jpg');
  });

  it('maps poster variant specs correctly', async () => {
    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);

    const { result } = renderHook(() => useImageVariants('https://r2.dev/abc.jpg', 'poster'));

    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(result.current.variants[0]).toMatchObject({
      label: 'Original',
      width: null,
      quality: null,
    });
    expect(result.current.variants[1]).toMatchObject({ label: 'SM', width: 200, quality: 80 });
    expect(result.current.variants[2]).toMatchObject({ label: 'MD', width: 400, quality: 85 });
    expect(result.current.variants[3]).toMatchObject({ label: 'LG', width: 800, quality: 90 });
  });

  it('maps backdrop variant specs correctly', async () => {
    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);

    const { result } = renderHook(() => useImageVariants('https://r2.dev/abc.jpg', 'backdrop'));

    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(result.current.variants[1]).toMatchObject({ width: 480 });
    expect(result.current.variants[2]).toMatchObject({ width: 960 });
    expect(result.current.variants[3]).toMatchObject({ width: 1920 });
  });

  it('maps photo variant specs correctly', async () => {
    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);

    const { result } = renderHook(() => useImageVariants('https://r2.dev/abc.jpg', 'photo'));

    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(result.current.variants[1]).toMatchObject({ width: 100 });
    expect(result.current.variants[2]).toMatchObject({ width: 200 });
    expect(result.current.variants[3]).toMatchObject({ width: 400 });
  });

  it('calls /api/image-check with all 4 URLs', async () => {
    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);

    renderHook(() => useImageVariants('https://r2.dev/abc.jpg', 'poster'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe('/api/image-check');
    const body = JSON.parse(call[1].body);
    expect(body.urls).toHaveLength(4);
  });

  it('counts ready variants correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        results: [
          { url: 'https://r2.dev/abc.jpg', status: 'ok' },
          { url: 'https://r2.dev/abc_sm.jpg', status: 'ok' },
          { url: 'https://r2.dev/abc_md.jpg', status: 'missing' },
          { url: 'https://r2.dev/abc_lg.jpg', status: 'ok' },
        ],
      }),
    });

    const { result } = renderHook(() => useImageVariants('https://r2.dev/abc.jpg', 'poster'));

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.readyCount).toBe(3);
    expect(result.current.totalCount).toBe(4);
  });

  it('sets all statuses to error on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useImageVariants('https://r2.dev/abc.jpg', 'poster'));

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });

  it('recheck re-triggers the fetch', async () => {
    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);

    const { result } = renderHook(() => useImageVariants('https://r2.dev/abc.jpg', 'poster'));

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);
    act(() => result.current.recheck());

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});
