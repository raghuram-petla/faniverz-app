import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

import { itemKey, hasIssue, useValidations } from '@/hooks/useValidations';
import { supabase } from '@/lib/supabase-browser';
import type { ScanResult } from '@/hooks/useValidationTypes';

const mockGetSession = vi.mocked(supabase.auth.getSession);

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const makeResult = (overrides: Partial<ScanResult> = {}): ScanResult => ({
  id: 'test-1',
  entity: 'movies',
  field: 'poster_url',
  currentUrl: 'test.jpg',
  urlType: 'local',
  originalExists: true,
  variants: { sm: true, md: true, lg: true },
  entityLabel: 'Test',
  tmdbId: 100,
  ...overrides,
});

describe('itemKey', () => {
  it('returns id-field composite key', () => {
    const result = makeResult({ id: 'abc', field: 'poster_url' });
    expect(itemKey(result)).toBe('abc-poster_url');
  });

  it('handles different fields', () => {
    expect(itemKey(makeResult({ id: 'x', field: 'backdrop_url' }))).toBe('x-backdrop_url');
  });
});

describe('hasIssue', () => {
  it('returns false for fully healthy local result', () => {
    expect(hasIssue(makeResult())).toBe(false);
  });

  it('returns true for external URL type', () => {
    expect(hasIssue(makeResult({ urlType: 'external' }))).toBe(true);
  });

  it('returns true when original is missing', () => {
    expect(hasIssue(makeResult({ originalExists: false }))).toBe(true);
  });

  it('returns true when sm variant is missing', () => {
    expect(hasIssue(makeResult({ variants: { sm: false, md: true, lg: true } }))).toBe(true);
  });

  it('returns true when md variant is missing', () => {
    expect(hasIssue(makeResult({ variants: { sm: true, md: false, lg: true } }))).toBe(true);
  });

  it('returns true when lg variant is missing', () => {
    expect(hasIssue(makeResult({ variants: { sm: true, md: true, lg: false } }))).toBe(true);
  });

  it('returns true when all variants are missing', () => {
    expect(hasIssue(makeResult({ variants: { sm: false, md: false, lg: false } }))).toBe(true);
  });

  it('returns false when variants are null (logos)', () => {
    expect(hasIssue(makeResult({ variants: { sm: null, md: null, lg: null } }))).toBe(false);
  });

  it('returns false for full_r2 type with all OK', () => {
    expect(hasIssue(makeResult({ urlType: 'full_r2' }))).toBe(false);
  });
});

// --- Test non-exported helpers via the module's internal logic ---
// We can't import filterResults/getSelectedFixItems directly since they're not exported,
// but we can test the exported helpers thoroughly to cover remaining branches.

describe('hasIssue — additional branch coverage', () => {
  it('returns true when external even if originalExists is true and variants ok', () => {
    expect(
      hasIssue(
        makeResult({
          urlType: 'external',
          originalExists: true,
          variants: { sm: true, md: true, lg: true },
        }),
      ),
    ).toBe(true);
  });

  it('returns true when originalExists is false even if variants are all true', () => {
    expect(
      hasIssue(
        makeResult({
          urlType: 'local',
          originalExists: false,
          variants: { sm: true, md: true, lg: true },
        }),
      ),
    ).toBe(true);
  });

  it('returns false for local type with originalExists true and all variants true', () => {
    expect(
      hasIssue(
        makeResult({
          urlType: 'local',
          originalExists: true,
          variants: { sm: true, md: true, lg: true },
        }),
      ),
    ).toBe(false);
  });

  it('short-circuits on urlType external before checking variants', () => {
    // external + missing variants still returns true (from first check)
    expect(
      hasIssue(
        makeResult({
          urlType: 'external',
          originalExists: true,
          variants: { sm: false, md: false, lg: false },
        }),
      ),
    ).toBe(true);
  });

  it('short-circuits on originalExists=false before checking variants', () => {
    expect(
      hasIssue(
        makeResult({
          urlType: 'local',
          originalExists: false,
          variants: { sm: false, md: false, lg: false },
        }),
      ),
    ).toBe(true);
  });

  it('returns false when originalExists is null and all variants are true', () => {
    // originalExists=null means not checked yet; only variant false triggers issue
    expect(
      hasIssue(
        makeResult({
          urlType: 'local',
          originalExists: null,
          variants: { sm: true, md: true, lg: true },
        }),
      ),
    ).toBe(false);
  });

  it('returns true when only lg variant is missing', () => {
    expect(
      hasIssue(
        makeResult({
          urlType: 'full_r2',
          originalExists: true,
          variants: { sm: true, md: true, lg: false },
        }),
      ),
    ).toBe(true);
  });
});

// --- Hook-level tests for useValidations ---

describe('useValidations hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    } as never);
    global.fetch = vi.fn();
  });

  it('startScan fetches scan results and sets progress', async () => {
    const scanResults: ScanResult[] = [
      makeResult({ id: 'r1', field: 'poster_url', urlType: 'external' }),
      makeResult({ id: 'r2', field: 'backdrop_url' }),
    ];
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: scanResults, total: 2 }),
      } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startScan('movies');
    });

    expect(result.current.scanProgress?.scanned).toBe(2);
    expect(result.current.scanProgress?.isScanning).toBe(false);
    expect(result.current.allScanResults).toHaveLength(2);
  });

  it('startScan throws and clears progress on non-ok response', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'bad' }),
      } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await expect(
      act(async () => {
        await result.current.startScan('movies');
      }),
    ).rejects.toThrow('Scan failed');

    expect(result.current.scanProgress).toBeNull();
  });

  it('startScan with deep=true passes deep param', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [], total: 0 }),
      } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startScan('movies', true);
    });

    const fetchCalls = vi.mocked(global.fetch).mock.calls;
    const scanCall = fetchCalls.find((c) => String(c[0]).includes('scan'));
    expect(scanCall).toBeDefined();
    const body = JSON.parse((scanCall![1] as RequestInit).body as string);
    expect(body.deep).toBe(true);
  });

  it('toggleItem adds and removes items from selection', async () => {
    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    act(() => {
      result.current.toggleItem('r1-poster_url');
    });
    expect(result.current.selectedItems.has('r1-poster_url')).toBe(true);

    act(() => {
      result.current.toggleItem('r1-poster_url');
    });
    expect(result.current.selectedItems.has('r1-poster_url')).toBe(false);
  });

  it('selectAllIssues selects all results with issues', async () => {
    const scanResults: ScanResult[] = [
      makeResult({ id: 'r1', field: 'poster_url', urlType: 'external' }),
      makeResult({ id: 'r2', field: 'backdrop_url' }), // no issue
    ];
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: scanResults, total: 2 }),
      } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startScan('movies');
    });

    act(() => {
      result.current.selectAllIssues();
    });

    expect(result.current.selectedItems.has('r1-poster_url')).toBe(true);
    expect(result.current.selectedItems.has('r2-backdrop_url')).toBe(false);
  });

  it('deselectAll clears all selections', async () => {
    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    act(() => {
      result.current.toggleItem('r1-poster_url');
    });
    expect(result.current.selectedItems.size).toBe(1);

    act(() => {
      result.current.deselectAll();
    });
    expect(result.current.selectedItems.size).toBe(0);
  });

  it('setActiveFilter changes filtered results', async () => {
    const scanResults: ScanResult[] = [
      makeResult({ id: 'r1', field: 'poster_url', urlType: 'external' }),
      makeResult({ id: 'r2', field: 'backdrop_url', urlType: 'local' }),
    ];
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: scanResults, total: 2 }),
      } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startScan('movies');
    });

    act(() => {
      result.current.setActiveFilter('external');
    });
    expect(result.current.scanResults).toHaveLength(1);
    expect(result.current.scanResults[0].urlType).toBe('external');

    act(() => {
      result.current.setActiveFilter('ok');
    });
    expect(result.current.scanResults).toHaveLength(1);
    expect(result.current.scanResults[0].id).toBe('r2');

    act(() => {
      result.current.setActiveFilter('missing');
    });
    // r1 is external (filtered out), r2 is local with no issue
    expect(result.current.scanResults).toHaveLength(0);
  });

  it('fixSelected sends batches and updates results', async () => {
    const scanResults: ScanResult[] = [
      makeResult({ id: 'r1', field: 'poster_url', urlType: 'external', tmdbId: 101 }),
    ];
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: scanResults, total: 1 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 'r1', field: 'poster_url', status: 'fixed', newUrl: '/r2/new.jpg' }],
        }),
      } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startScan('movies');
    });

    act(() => {
      result.current.toggleItem('r1-poster_url');
    });

    await act(async () => {
      await result.current.fixSelected();
    });

    expect(result.current.fixProgress?.fixed).toBe(1);
    expect(result.current.fixProgress?.isFixing).toBe(false);
    expect(result.current.selectedItems.size).toBe(0);
    // Result should be updated to local
    expect(result.current.allScanResults[0].urlType).toBe('local');
  });

  it('fixSelected handles failed fix results', async () => {
    const scanResults: ScanResult[] = [
      makeResult({ id: 'r1', field: 'poster_url', urlType: 'external', tmdbId: 101 }),
    ];
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: scanResults, total: 1 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 'r1', field: 'poster_url', status: 'failed', error: 'oops' }],
        }),
      } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startScan('movies');
    });
    act(() => {
      result.current.toggleItem('r1-poster_url');
    });

    await act(async () => {
      await result.current.fixSelected();
    });

    expect(result.current.fixProgress?.failed).toBe(1);
  });

  it('fixSelected handles non-ok response for a batch', async () => {
    const scanResults: ScanResult[] = [
      makeResult({ id: 'r1', field: 'poster_url', urlType: 'external', tmdbId: 101 }),
    ];
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: scanResults, total: 1 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startScan('movies');
    });
    act(() => {
      result.current.toggleItem('r1-poster_url');
    });

    await act(async () => {
      await result.current.fixSelected();
    });

    expect(result.current.fixProgress?.failed).toBe(1);
  });

  it('fixSelected does nothing when no items selected', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entities: [] }),
    } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.fixSelected();
    });

    expect(result.current.fixProgress).toBeNull();
  });

  it('stopScan sets abortRef', () => {
    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });
    // Just ensure it doesn't crash
    act(() => {
      result.current.stopScan();
    });
  });

  it('startScan throws when session is expired', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    } as never);

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entities: [] }),
    } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await expect(
      act(async () => {
        await result.current.startScan('movies');
      }),
    ).rejects.toThrow('Session expired');
  });

  it('fixSelected handles missing variant (regenerate_variants) fix type', async () => {
    const scanResults: ScanResult[] = [
      makeResult({
        id: 'r1',
        field: 'poster_url',
        urlType: 'local',
        originalExists: true,
        variants: { sm: false, md: true, lg: true },
      }),
    ];
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entities: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: scanResults, total: 1 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 'r1', field: 'poster_url', status: 'fixed' }],
        }),
      } as Response);

    const { result } = renderHook(() => useValidations(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startScan('movies');
    });
    act(() => {
      result.current.toggleItem('r1-poster_url');
    });

    await act(async () => {
      await result.current.fixSelected();
    });

    expect(result.current.fixProgress?.fixed).toBe(1);
  });
});
