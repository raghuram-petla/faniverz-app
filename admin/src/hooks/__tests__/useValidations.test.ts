import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

import { useValidations, itemKey, hasIssue } from '@/hooks/useValidations';
import type { ScanResult } from '@/hooks/useValidationTypes';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    id: 'item-1',
    entity: 'movies',
    field: 'poster_url',
    currentUrl: '/storage/posters/movie-1.jpg',
    urlType: 'local',
    originalExists: true,
    variants: { sm: true, md: true, lg: true },
    entityLabel: 'Test Movie',
    tmdbId: 12345,
    ...overrides,
  };
}

describe('itemKey', () => {
  it('returns id-field composite key', () => {
    const result = makeScanResult({ id: 'abc', field: 'poster_url' });
    expect(itemKey(result)).toBe('abc-poster_url');
  });

  it('handles different fields', () => {
    const result = makeScanResult({ id: 'xyz', field: 'backdrop_url' });
    expect(itemKey(result)).toBe('xyz-backdrop_url');
  });
});

describe('hasIssue', () => {
  it('returns true for external URL type', () => {
    const result = makeScanResult({
      urlType: 'external',
      originalExists: true,
      variants: { sm: true, md: true, lg: true },
    });
    expect(hasIssue(result)).toBe(true);
  });

  it('returns true when originalExists is false', () => {
    const result = makeScanResult({
      urlType: 'local',
      originalExists: false,
      variants: { sm: true, md: true, lg: true },
    });
    expect(hasIssue(result)).toBe(true);
  });

  it('returns true when sm variant is missing', () => {
    const result = makeScanResult({
      urlType: 'local',
      originalExists: true,
      variants: { sm: false, md: true, lg: true },
    });
    expect(hasIssue(result)).toBe(true);
  });

  it('returns true when md variant is missing', () => {
    const result = makeScanResult({
      urlType: 'local',
      originalExists: true,
      variants: { sm: true, md: false, lg: true },
    });
    expect(hasIssue(result)).toBe(true);
  });

  it('returns true when lg variant is missing', () => {
    const result = makeScanResult({
      urlType: 'local',
      originalExists: true,
      variants: { sm: true, md: true, lg: false },
    });
    expect(hasIssue(result)).toBe(true);
  });

  it('returns false for local URL with all variants present', () => {
    const result = makeScanResult({
      urlType: 'local',
      originalExists: true,
      variants: { sm: true, md: true, lg: true },
    });
    expect(hasIssue(result)).toBe(false);
  });

  it('returns false for full_r2 URL with all variants present', () => {
    const result = makeScanResult({
      urlType: 'full_r2',
      originalExists: true,
      variants: { sm: true, md: true, lg: true },
    });
    expect(hasIssue(result)).toBe(false);
  });
});

describe('useValidations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: summary fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ entities: [] }),
    });
  });

  it('initializes with empty scan results and no progress', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    expect(result.current.allScanResults).toEqual([]);
    expect(result.current.scanProgress).toBeNull();
    expect(result.current.fixProgress).toBeNull();
    expect(result.current.selectedItems.size).toBe(0);
    expect(result.current.activeFilter).toBe('all');
  });

  it('loads summary on mount', async () => {
    const summaryData = [
      { entity: 'movies', field: 'poster_url', total: 10, external: 2, local: 8, nullCount: 0 },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ entities: summaryData }),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.summary).toEqual(summaryData));
  });

  it('startScan sets progress and populates scanResults on success', async () => {
    const scanResults: ScanResult[] = [makeScanResult()];

    // First call = summary, second call = scan
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ entities: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: scanResults, total: 1 }),
      });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startScan('movies');
    });

    expect(result.current.allScanResults).toHaveLength(1);
    expect(result.current.scanProgress?.isScanning).toBe(false);
    expect(result.current.scanProgress?.total).toBe(1);
  });

  it('startScan sets progress null and throws on non-ok response', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ entities: [] }) })
      .mockResolvedValueOnce({ ok: false });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.startScan('movies');
      } catch {
        // expected
      }
    });

    expect(result.current.scanProgress).toBeNull();
  });

  it('toggleItem adds and removes items from selectedItems', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    act(() => result.current.toggleItem('item-1-poster_url'));
    expect(result.current.selectedItems.has('item-1-poster_url')).toBe(true);

    act(() => result.current.toggleItem('item-1-poster_url'));
    expect(result.current.selectedItems.has('item-1-poster_url')).toBe(false);
  });

  it('deselectAll clears all selected items', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    act(() => result.current.toggleItem('item-1-poster_url'));
    act(() => result.current.toggleItem('item-2-backdrop_url'));
    expect(result.current.selectedItems.size).toBe(2);

    act(() => result.current.deselectAll());
    expect(result.current.selectedItems.size).toBe(0);
  });

  it('selectAllIssues selects only items with issues', async () => {
    const goodResult = makeScanResult({
      id: 'good',
      field: 'poster_url',
      urlType: 'local',
      originalExists: true,
      variants: { sm: true, md: true, lg: true },
    });
    const badResult = makeScanResult({ id: 'bad', field: 'poster_url', urlType: 'external' });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ entities: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [goodResult, badResult], total: 2 }),
      });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startScan('movies');
    });

    act(() => result.current.selectAllIssues());

    expect(result.current.selectedItems.has('bad-poster_url')).toBe(true);
    expect(result.current.selectedItems.has('good-poster_url')).toBe(false);
  });

  it('setActiveFilter changes filtered results', async () => {
    const externalResult = makeScanResult({ id: 'ext', field: 'poster_url', urlType: 'external' });
    const localResult = makeScanResult({
      id: 'loc',
      field: 'poster_url',
      urlType: 'local',
      originalExists: true,
      variants: { sm: true, md: true, lg: true },
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ entities: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [externalResult, localResult], total: 2 }),
      });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startScan('movies');
    });

    // 'all' filter returns everything
    expect(result.current.scanResults).toHaveLength(2);

    // 'external' filter returns only external items
    act(() => result.current.setActiveFilter('external'));
    expect(result.current.scanResults).toHaveLength(1);
    expect(result.current.scanResults[0].id).toBe('ext');

    // 'ok' filter returns only items without issues
    act(() => result.current.setActiveFilter('ok'));
    expect(result.current.scanResults).toHaveLength(1);
    expect(result.current.scanResults[0].id).toBe('loc');

    // 'missing' filter returns items with issues that are not external
    const missingResult = makeScanResult({
      id: 'miss',
      field: 'poster_url',
      urlType: 'local',
      originalExists: false,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi
        .fn()
        .mockResolvedValue({ results: [externalResult, localResult, missingResult], total: 3 }),
    });

    await act(async () => {
      await result.current.startScan('movies');
    });

    act(() => result.current.setActiveFilter('missing'));
    expect(result.current.scanResults).toHaveLength(1);
    expect(result.current.scanResults[0].id).toBe('miss');
  });

  it('fixSelected does nothing when no items are selected', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    // No items selected, fixSelected should not call fetch for fix endpoint
    await act(async () => {
      await result.current.fixSelected();
    });

    // Only the summary fetch should have been called
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fixSelected processes selected items and updates scan results', async () => {
    const externalResult = makeScanResult({
      id: 'ext',
      field: 'poster_url',
      urlType: 'external',
      tmdbId: 999,
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ entities: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [externalResult], total: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            { id: 'ext', field: 'poster_url', status: 'fixed', newUrl: '/storage/new.jpg' },
          ],
        }),
      });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startScan('movies');
    });

    act(() => result.current.toggleItem('ext-poster_url'));

    await act(async () => {
      await result.current.fixSelected();
    });

    expect(result.current.fixProgress?.isFixing).toBe(false);
    expect(result.current.fixProgress?.fixed).toBe(1);
    expect(result.current.fixProgress?.failed).toBe(0);
    expect(result.current.selectedItems.size).toBe(0);
  });

  it('fixSelected counts failed items when fix returns failed status', async () => {
    const externalResult = makeScanResult({
      id: 'ext',
      field: 'poster_url',
      urlType: 'external',
      tmdbId: 999,
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ entities: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [externalResult], total: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [{ id: 'ext', field: 'poster_url', status: 'failed', error: 'TMDB error' }],
        }),
      });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startScan('movies');
    });

    act(() => result.current.toggleItem('ext-poster_url'));

    await act(async () => {
      await result.current.fixSelected();
    });

    expect(result.current.fixProgress?.failed).toBe(1);
    expect(result.current.fixProgress?.fixed).toBe(0);
  });

  it('fixSelected handles non-ok fix response by counting whole batch as failed', async () => {
    const externalResult = makeScanResult({
      id: 'ext',
      field: 'poster_url',
      urlType: 'external',
      tmdbId: 999,
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ entities: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [externalResult], total: 1 }),
      })
      .mockResolvedValueOnce({ ok: false });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startScan('movies');
    });

    act(() => result.current.toggleItem('ext-poster_url'));

    await act(async () => {
      await result.current.fixSelected();
    });

    expect(result.current.fixProgress?.failed).toBe(1);
  });

  it('stopScan sets abortRef', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useValidations(), { wrapper: Wrapper });

    // stopScan is a no-throw synchronous function
    act(() => result.current.stopScan());
    // We can't directly observe abortRef but verify the function exists and doesn't throw
    expect(result.current.stopScan).toBeTypeOf('function');
  });
});
