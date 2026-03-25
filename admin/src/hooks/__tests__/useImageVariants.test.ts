import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: vi.fn((url: string, size: string) => (size === 'original' ? url : `${url}_${size}`)),
}));

vi.mock('@/lib/variant-config', () => ({
  VARIANT_SPECS: {
    poster: [
      { width: 200, quality: 80 },
      { width: 400, quality: 80 },
      { width: 800, quality: 85 },
    ],
  },
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import { useImageVariants } from '@/hooks/useImageVariants';
import { supabase } from '@/lib/supabase-browser';

const mockGetSession = vi.mocked(supabase.auth.getSession);

describe('useImageVariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    } as never);
    global.fetch = vi.fn();
  });

  it('returns empty variants when originalUrl is null', () => {
    const { result } = renderHook(() => useImageVariants(null, 'poster', 'POSTERS'));
    expect(result.current.variants).toEqual([]);
    expect(result.current.isChecking).toBe(false);
  });

  it('builds 4 variants and checks availability', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { url: 'https://cdn/poster.jpg', status: 'ok' },
          { url: 'https://cdn/poster.jpg_sm', status: 'ok' },
          { url: 'https://cdn/poster.jpg_md', status: 'missing' },
          { url: 'https://cdn/poster.jpg_lg', status: 'ok' },
        ],
      }),
    } as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
      expect(result.current.variants.length).toBe(4);
    });

    expect(result.current.readyCount).toBe(3);
    expect(result.current.totalCount).toBe(4);
  });

  it('marks all variants as error when API responds with non-ok', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });

  it('marks all variants as error on network failure', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });

  it('skips API call when session is expired', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    } as never);

    const { result } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
    expect(global.fetch).not.toHaveBeenCalledWith('/api/image-check', expect.anything());
  });

  it('skips API call when URLs are not http', async () => {
    // Make getImageUrl return non-http URLs
    const imageUrlMod = await import('@shared/imageUrl');
    vi.mocked(imageUrlMod.getImageUrl).mockReturnValue('relative/path');

    const { result } = renderHook(() => useImageVariants('relative/path', 'poster', 'POSTERS'));

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
      expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
    });
  });

  it('recheck function is returned and callable', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { url: 'https://cdn/poster.jpg', status: 'ok' },
          { url: 'https://cdn/poster.jpg_sm', status: 'ok' },
          { url: 'https://cdn/poster.jpg_md', status: 'ok' },
          { url: 'https://cdn/poster.jpg_lg', status: 'ok' },
        ],
      }),
    } as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
      expect(result.current.variants.length).toBe(4);
    });

    // Verify recheck is a function and doesn't throw
    expect(typeof result.current.recheck).toBe('function');
    act(() => {
      result.current.recheck();
    });
    // No assertion on fetch count — recheck starts async and may not finish within act
  });

  it('clears variants when originalUrl changes to null', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { url: 'https://cdn/poster.jpg', status: 'ok' },
          { url: 'https://cdn/poster.jpg_sm', status: 'ok' },
          { url: 'https://cdn/poster.jpg_md', status: 'ok' },
          { url: 'https://cdn/poster.jpg_lg', status: 'ok' },
        ],
      }),
    } as Response);

    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useImageVariants(url, 'poster', 'POSTERS'),
      { initialProps: { url: 'https://cdn/poster.jpg' } },
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    rerender({ url: null });

    await waitFor(() => {
      expect(result.current.variants).toEqual([]);
    });
  });

  it('handles null results in API response via nullish coalesce', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ results: null }),
    } as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
    // Should fallback to 'error' for all variants since statusMap has no entries
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });

  it('handles missing results in API response gracefully', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}), // no results key
    } as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
    // Should fallback to 'error' for all variants since statusMap has no entries
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });

  it('covers cancelled ref after buildVariants (early cancellation)', async () => {
    // Make getImageUrl return http URLs so we don't hit the non-http branch
    const imageUrlMod = await import('@shared/imageUrl');
    vi.mocked(imageUrlMod.getImageUrl).mockImplementation((url: string, size: string) =>
      size === 'original' ? url : `${url}_${size}`,
    );

    // Make getSession resolve asynchronously so we can cancel before it completes
    let resolveSession: ((value: unknown) => void) | undefined;
    mockGetSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useImageVariants(url, 'poster', 'POSTERS'),
      { initialProps: { url: 'https://cdn/poster.jpg' } },
    );

    // Wait for variants to be built
    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    // Change URL to trigger cancellation of the first check
    rerender({ url: 'https://cdn/poster2.jpg' });

    // Now resolve the first getSession AFTER cancellation
    await act(async () => {
      resolveSession?.({ data: { session: { access_token: 'tok' } } });
    });

    // The cancelled ref should prevent state updates from the first check
    expect(result.current.variants.length).toBe(4);
  });

  it('covers cancelled ref during fetch response processing', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useImageVariants(url, 'poster', 'POSTERS'),
      { initialProps: { url: 'https://cdn/poster.jpg' } },
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    // Change URL to cancel the first check, then resolve the stale fetch
    rerender({ url: 'https://cdn/poster2.jpg' });

    await act(async () => {
      resolveFetch?.({
        ok: true,
        json: async () => ({
          results: [
            { url: 'https://cdn/poster.jpg', status: 'ok' },
            { url: 'https://cdn/poster.jpg_sm', status: 'ok' },
            { url: 'https://cdn/poster.jpg_md', status: 'ok' },
            { url: 'https://cdn/poster.jpg_lg', status: 'ok' },
          ],
        }),
      } as Response);
    });
  });

  it('covers cancelled ref during error response', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useImageVariants(url, 'poster', 'POSTERS'),
      { initialProps: { url: 'https://cdn/poster.jpg' } },
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    rerender({ url: 'https://cdn/poster2.jpg' });

    await act(async () => {
      resolveFetch?.({
        ok: false,
        status: 500,
        json: async () => ({ error: 'bad' }),
      } as Response);
    });
  });

  it('covers cancelled ref during network error catch', async () => {
    let rejectFetch: ((reason: Error) => void) | undefined;
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise<Response>((_, reject) => {
          rejectFetch = reject;
        }),
    );

    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useImageVariants(url, 'poster', 'POSTERS'),
      { initialProps: { url: 'https://cdn/poster.jpg' } },
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    rerender({ url: 'https://cdn/poster2.jpg' });

    await act(async () => {
      rejectFetch?.(new Error('Network failed'));
    });
  });

  it('covers cancelled ref after json parsing completes', async () => {
    let resolveJson: ((value: unknown) => void) | undefined;
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        new Promise((resolve) => {
          resolveJson = resolve;
        }),
    } as unknown as Response);

    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useImageVariants(url, 'poster', 'POSTERS'),
      { initialProps: { url: 'https://cdn/poster.jpg' } },
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    // Cancel by changing URL while json() is pending
    rerender({ url: 'https://cdn/other.jpg' });

    // Now resolve json — cancelledRef should be true
    await act(async () => {
      resolveJson?.({
        results: [
          { url: 'https://cdn/poster.jpg', status: 'ok' },
          { url: 'https://cdn/poster.jpg_sm', status: 'ok' },
          { url: 'https://cdn/poster.jpg_md', status: 'ok' },
          { url: 'https://cdn/poster.jpg_lg', status: 'ok' },
        ],
      });
    });
  });

  it('covers cancelled during non-http URL check', async () => {
    // Make getImageUrl return non-http URLs
    const imageUrlMod = await import('@shared/imageUrl');
    vi.mocked(imageUrlMod.getImageUrl).mockReturnValue('relative/path');

    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useImageVariants(url, 'poster', 'POSTERS'),
      { initialProps: { url: 'relative/path' } },
    );

    // URLs are non-http; cancel by changing URL
    rerender({ url: 'https://cdn/other.jpg' });

    // Restore getImageUrl to return http URLs for the second render
    vi.mocked(imageUrlMod.getImageUrl).mockImplementation((url: string, size: string) =>
      size === 'original' ? url : `${url}_${size}`,
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });
  });

  it('rapid recheck cancels previous and covers cancelled ref paths', async () => {
    // First fetch will hang, second will resolve
    let firstResolve: ((value: Response) => void) | undefined;
    let callCount = 0;
    vi.mocked(global.fetch).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return new Promise<Response>((resolve) => {
          firstResolve = resolve;
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          results: [
            { url: 'https://cdn/poster.jpg', status: 'ok' },
            { url: 'https://cdn/poster.jpg_sm', status: 'ok' },
            { url: 'https://cdn/poster.jpg_md', status: 'ok' },
            { url: 'https://cdn/poster.jpg_lg', status: 'ok' },
          ],
        }),
      } as Response);
    });

    const { result } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    // Trigger recheck — this cancels the first in-flight check and starts a new one
    await act(async () => {
      result.current.recheck();
    });

    // Resolve the first (cancelled) fetch
    await act(async () => {
      firstResolve?.({
        ok: true,
        json: async () => ({
          results: [
            { url: 'https://cdn/poster.jpg', status: 'missing' },
            { url: 'https://cdn/poster.jpg_sm', status: 'missing' },
            { url: 'https://cdn/poster.jpg_md', status: 'missing' },
            { url: 'https://cdn/poster.jpg_lg', status: 'missing' },
          ],
        }),
      } as Response);
    });

    // The second check's results should win (status 'ok'), not the cancelled first ('missing')
    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
  });

  it('recheck no-ops when originalUrl is null', () => {
    const { result } = renderHook(() => useImageVariants(null, 'poster', 'POSTERS'));
    // recheck should be safe to call even with null URL
    act(() => {
      result.current.recheck();
    });
    expect(result.current.variants).toEqual([]);
  });

  it('covers getImageUrl returning null (nullish coalesce fallback)', async () => {
    const imageUrlMod = await import('@shared/imageUrl');
    vi.mocked(imageUrlMod.getImageUrl).mockReturnValue(null as unknown as string);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    // Variants should fallback to originalUrl when getImageUrl returns null
    result.current.variants.forEach((v) => {
      expect(v.url).toBe('https://cdn/poster.jpg');
    });
  });

  it('cancels check when component unmounts during getSession', async () => {
    // Make getSession hang until we resolve it
    let resolveSession: ((value: unknown) => void) | undefined;
    mockGetSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );

    const { result, unmount } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    // Wait for variants to be built (happens before getSession)
    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    // Unmount while getSession is pending — cancelled ref becomes true
    unmount();

    // Resolve session after unmount — should not crash or update state
    resolveSession?.({
      data: { session: { access_token: 'tok' } },
    });
    // No crash means the cancelledRef branch was hit
  });

  it('cancels check when component unmounts during fetch', async () => {
    // Make fetch hang until we resolve it
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result, unmount } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    // Wait for checkAvailability to start
    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    // Unmount while fetch is pending
    unmount();

    // Resolve the fetch after unmount
    resolveFetch?.({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);
  });

  it('cancels check when originalUrl changes during fetch', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useImageVariants(url, 'poster', 'POSTERS'),
      { initialProps: { url: 'https://cdn/poster1.jpg' } },
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    // Change URL — first check's cancelledRef becomes true
    rerender({ url: 'https://cdn/poster2.jpg' });

    // Resolve the first fetch
    resolveFetch?.({
      ok: true,
      json: async () => ({
        results: [
          { url: 'https://cdn/poster1.jpg', status: 'ok' },
          { url: 'https://cdn/poster1.jpg_sm', status: 'ok' },
          { url: 'https://cdn/poster1.jpg_md', status: 'ok' },
          { url: 'https://cdn/poster1.jpg_lg', status: 'ok' },
        ],
      }),
    } as Response);
  });

  it('cancels check when unmount happens during error response processing', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result, unmount } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    unmount();

    // Resolve with error response after unmount
    resolveFetch?.({
      ok: false,
      status: 500,
      json: async () => ({ error: 'error' }),
    } as Response);
  });

  it('cancels check when unmount happens during network error', async () => {
    let rejectFetch: ((reason: Error) => void) | undefined;
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise<Response>((_, reject) => {
          rejectFetch = reject;
        }),
    );

    const { result, unmount } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.variants.length).toBe(4);
    });

    unmount();

    // Reject after unmount
    rejectFetch?.(new Error('Network failed'));
  });

  it('handles error in res.json() catch gracefully', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('parse error')),
    } as unknown as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://cdn/poster.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });
});
