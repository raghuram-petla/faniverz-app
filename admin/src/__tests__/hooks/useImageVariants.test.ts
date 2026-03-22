import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null }),
    },
  },
}));

import { useImageVariants } from '@/hooks/useImageVariants';

function mockCheckResponse(statuses: ('ok' | 'missing' | 'error')[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
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
    const { result } = renderHook(() => useImageVariants(null, 'poster', 'POSTERS'));
    expect(result.current.variants).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.readyCount).toBe(0);
  });

  it('derives 4 variant URLs from the original URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { url: 'https://r2.dev/abc.jpg', status: 'ok' },
          { url: 'https://r2.dev/abc_sm.jpg', status: 'ok' },
          { url: 'https://r2.dev/abc_md.jpg', status: 'ok' },
          { url: 'https://r2.dev/abc_lg.jpg', status: 'ok' },
        ],
      }),
    });

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/abc.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(result.current.variants).toHaveLength(4);
    expect(result.current.variants[0].url).toBe('https://r2.dev/abc.jpg');
    expect(result.current.variants[1].url).toBe('https://r2.dev/abc_sm.jpg');
    expect(result.current.variants[2].url).toBe('https://r2.dev/abc_md.jpg');
    expect(result.current.variants[3].url).toBe('https://r2.dev/abc_lg.jpg');
  });

  it('maps poster variant specs correctly', async () => {
    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/abc.jpg', 'poster', 'POSTERS'),
    );

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

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/abc.jpg', 'backdrop', 'BACKDROPS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(result.current.variants[1]).toMatchObject({ width: 480 });
    expect(result.current.variants[2]).toMatchObject({ width: 960 });
    expect(result.current.variants[3]).toMatchObject({ width: 1920 });
  });

  it('maps photo variant specs correctly', async () => {
    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/abc.jpg', 'photo', 'ACTORS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(result.current.variants[1]).toMatchObject({ width: 100 });
    expect(result.current.variants[2]).toMatchObject({ width: 200 });
    expect(result.current.variants[3]).toMatchObject({ width: 400 });
  });

  it('calls /api/image-check with all 4 URLs', async () => {
    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);

    renderHook(() => useImageVariants('https://r2.dev/abc.jpg', 'poster', 'POSTERS'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe('/api/image-check');
    const body = JSON.parse(call[1].body);
    expect(body.urls).toHaveLength(4);
  });

  it('counts ready variants correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { url: 'https://r2.dev/abc.jpg', status: 'ok' },
          { url: 'https://r2.dev/abc_sm.jpg', status: 'ok' },
          { url: 'https://r2.dev/abc_md.jpg', status: 'missing' },
          { url: 'https://r2.dev/abc_lg.jpg', status: 'ok' },
        ],
      }),
    });

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/abc.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.readyCount).toBe(3);
    expect(result.current.totalCount).toBe(4);
  });

  it('sets all statuses to error on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/abc.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });

  it('recheck re-triggers the fetch', async () => {
    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/abc.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockCheckResponse(['ok', 'ok', 'ok', 'ok']);
    act(() => result.current.recheck());

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it('resets isChecking when session is expired', async () => {
    // @regression: if session.access_token is null, isChecking must be reset to false
    const { supabase } = await import('@/lib/supabase-browser');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as never);

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/test.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not update state after originalUrl is cleared (cancellation guard)', async () => {
    // @regression: when originalUrl becomes null, the ongoing async check for the previous URL
    // must not call setVariants after the effect cleanup runs (cancelled = true)
    let resolveFetch!: (v: unknown) => void;
    const fetchPending = new Promise((res) => {
      resolveFetch = res;
    });

    // First fetch hangs to simulate slow network
    mockFetch.mockImplementationOnce(() => fetchPending);

    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useImageVariants(url, 'poster', 'POSTERS'),
      { initialProps: { url: 'https://r2.dev/old.jpg' as string | null } },
    );

    // Variants are initially set to 'checking'
    expect(result.current.variants.every((v) => v.status === 'checking')).toBe(true);

    // Clear the URL — triggers effect cleanup which sets cancelled = true
    rerender({ url: null });

    // Now let the stale fetch resolve — should not call setVariants because cancelled is true
    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          results: [
            { url: 'https://r2.dev/old.jpg', status: 'ok' },
            { url: 'https://r2.dev/old_sm.jpg', status: 'ok' },
            { url: 'https://r2.dev/old_md.jpg', status: 'ok' },
            { url: 'https://r2.dev/old_lg.jpg', status: 'ok' },
          ],
        }),
      });
      // Flush promises
      await Promise.resolve();
    });

    // After URL cleared, variants should be empty — not populated by stale fetch
    expect(result.current.variants).toEqual([]);
  });

  it('sets all statuses to error on non-OK API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/abc.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
    consoleSpy.mockRestore();
  });

  it('sets error status when URLs are not http (bare relative keys)', async () => {
    // getImageUrl returns a relative key when base URL is not set
    const { result } = renderHook(() => useImageVariants('relative/path.jpg', 'poster', 'POSTERS'));

    await waitFor(() => {
      // All variants should be set to error since URLs don't start with http
      const allError = result.current.variants.every((v) => v.status === 'error');
      if (result.current.variants.length > 0) {
        expect(allError).toBe(true);
      }
    });
    // No fetch should have been made
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles missing results field in API response gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // no results field
    });

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/abc.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    // Without results, all variants should fallback to 'error'
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });

  it('handles API error response (non-ok status)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server error' }),
    } as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/error.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
    expect(consoleError).toHaveBeenCalledWith(
      '[useImageVariants] API error:',
      500,
      expect.any(Object),
    );
    consoleError.mockRestore();
  });

  it('handles API error response where json parsing fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/error2.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
    consoleError.mockRestore();
  });

  it('handles network failure (fetch throws)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/netfail.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });

  it('falls back to error when statusMap does not contain a variant URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [], // No results — all variants should get 'error' fallback
      }),
    } as unknown as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/nomatch.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });

  it('handles null data.results via nullish coalesce', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: null }),
    } as unknown as Response);

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/nullresults.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
  });

  it('recheck does nothing when originalUrl is null', async () => {
    const { result } = renderHook(() => useImageVariants(null, 'poster', 'POSTERS'));

    // Call recheck — should not crash or call fetch
    result.current.recheck();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resets isChecking when originalUrl changes to null during active check', async () => {
    // @regression: if isChecking was set to true and originalUrl becomes null,
    // the effect must reset isChecking so the UI doesn't show a perpetual spinner
    let resolveFetch!: (v: unknown) => void;
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveFetch = res;
        }),
    );

    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useImageVariants(url, 'poster', 'POSTERS'),
      { initialProps: { url: 'https://r2.dev/active.jpg' as string | null } },
    );

    // isChecking should be true while fetch is pending
    await waitFor(() => expect(result.current.isChecking).toBe(true));

    // Clear the URL — effect cleanup cancels, and effect body resets isChecking
    rerender({ url: null });

    // isChecking must be false after URL cleared
    expect(result.current.isChecking).toBe(false);
    expect(result.current.variants).toEqual([]);

    // Clean up hanging promise
    resolveFetch({ ok: true, json: async () => ({ results: [] }) });
  });

  it('marks all variants as error when API returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/test.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
    });
  });

  it('marks all variants as error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useImageVariants('https://r2.dev/test.jpg', 'poster', 'POSTERS'),
    );

    await waitFor(() => {
      expect(result.current.variants.every((v) => v.status === 'error')).toBe(true);
    });
  });
});
