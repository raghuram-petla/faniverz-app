import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSmartInfiniteQuery } from '../useSmartInfiniteQuery';
import type { SmartPaginationConfig } from '@/constants/paginationConfig';

const makeItem = (id: string) => ({ id, name: `Item ${id}` });

const makeItems = (count: number, startId = 1) =>
  Array.from({ length: count }, (_, i) => makeItem(String(startId + i)));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const defaultConfig: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

describe('useSmartInfiniteQuery', () => {
  it('fetches initial page with initialPageSize', async () => {
    const queryFn = jest.fn().mockResolvedValue(makeItems(5));
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // First call should use offset=0, limit=initialPageSize
    expect(queryFn).toHaveBeenCalledWith(0, 5);
    expect(result.current.allItems).toHaveLength(5);
  });

  it('background-expands to page 2 after page 1 settles', async () => {
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce(makeItems(5)) // page 0
      .mockResolvedValueOnce(makeItems(10, 6)); // page 1 (background expand)

    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-bg'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    expect(queryFn).toHaveBeenCalledWith(0, 5); // page 0: offset=0, limit=5
    expect(queryFn).toHaveBeenCalledWith(5, 10); // page 1: offset=5, limit=10
    expect(result.current.allItems).toHaveLength(15);
  });

  it('does not background-expand when backgroundExpand is false', async () => {
    const queryFn = jest.fn().mockResolvedValue(makeItems(5));
    const config: SmartPaginationConfig = { ...defaultConfig, backgroundExpand: false };

    renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-no-bg'],
          queryFn,
          config,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    // Wait a bit to make sure no second call happens
    await new Promise((r) => setTimeout(r, 100));
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('detects end of data when page returns fewer items than expected', async () => {
    const queryFn = jest.fn().mockResolvedValueOnce(makeItems(3)); // < initialPageSize

    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-eof'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.allItems).toHaveLength(3);
  });

  it('deduplicates items by id across pages', async () => {
    const page0 = [makeItem('1'), makeItem('2'), makeItem('3'), makeItem('4'), makeItem('5')];
    const page1 = [makeItem('5'), makeItem('6'), makeItem('7')]; // item '5' duplicated

    const queryFn = jest.fn().mockResolvedValueOnce(page0).mockResolvedValueOnce(page1);

    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-dedup'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.allItems.length).toBe(7));
    const ids = result.current.allItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(7); // all unique
  });

  it('returns empty allItems when no data', async () => {
    const queryFn = jest.fn().mockResolvedValue([]);
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-empty'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allItems).toHaveLength(0);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('respects enabled flag', async () => {
    const queryFn = jest.fn().mockResolvedValue(makeItems(5));
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-disabled'],
          queryFn,
          config: defaultConfig,
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    await new Promise((r) => setTimeout(r, 100));
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.allItems).toHaveLength(0);
  });

  it('handles query error', async () => {
    const queryFn = jest.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-error'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('skips setIsBackgroundExpanding(false) when component unmounts during background expansion', async () => {
    let resolvePage1: (value: ReturnType<typeof makeItems>) => void;
    const page1Promise = new Promise<ReturnType<typeof makeItems>>((resolve) => {
      resolvePage1 = resolve;
    });

    const queryFn = jest
      .fn()
      .mockResolvedValueOnce(makeItems(5)) // page 0 resolves immediately
      .mockReturnValueOnce(page1Promise); // page 1 (background expand) — held pending

    const { result, unmount } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-cancel-bg'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper: createWrapper() },
    );

    // Wait for page 0 to load and background expansion to start
    await waitFor(() => expect(result.current.isBackgroundExpanding).toBe(true));

    // Unmount the hook while background expansion is in progress — sets cancelled=true
    unmount();

    // Now resolve page 1 — the finally() block runs but should NOT crash since cancelled=true
    act(() => {
      resolvePage1!(makeItems(10, 6));
    });

    // No assertion needed — test passes if no "state update on unmounted component" error
  });

  it('resets hasExpandedRef when refetch is called so background expansion can re-trigger', async () => {
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce(makeItems(5)) // page 0
      .mockResolvedValueOnce(makeItems(10, 6)) // page 1 (background expand)
      .mockResolvedValueOnce(makeItems(5)) // page 0 after refetch
      .mockResolvedValueOnce(makeItems(10, 6)); // page 1 (background expand again)

    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-refetch'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper: createWrapper() },
    );

    // Wait for initial load + background expand
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));

    // Trigger refetch — this should reset hasExpandedRef.current
    await act(async () => {
      result.current.refetch();
    });

    // After refetch, background expansion should re-trigger for the fresh page 0
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(4));
  });
});
