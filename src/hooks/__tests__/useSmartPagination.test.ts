import { renderHook } from '@testing-library/react-native';
import { useSmartPagination } from '../useSmartPagination';
import type { SmartPaginationConfig } from '@/constants/paginationConfig';

const defaultConfig: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

describe('useSmartPagination', () => {
  it('computes dynamic threshold from item count and prefetchItemsRemaining', () => {
    const { result } = renderHook(() =>
      useSmartPagination({
        totalItems: 20,
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        config: defaultConfig,
      }),
    );
    // 5/20 = 0.25
    expect(result.current.onEndReachedThreshold).toBeCloseTo(0.25);
  });

  it('clamps threshold minimum to 0.2', () => {
    const { result } = renderHook(() =>
      useSmartPagination({
        totalItems: 100,
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        config: defaultConfig,
      }),
    );
    // 5/100 = 0.05 → clamped to 0.2
    expect(result.current.onEndReachedThreshold).toBe(0.2);
  });

  it('clamps threshold maximum to 0.8', () => {
    const { result } = renderHook(() =>
      useSmartPagination({
        totalItems: 3,
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        config: defaultConfig,
      }),
    );
    // 5/3 = 1.67 → clamped to 0.8
    expect(result.current.onEndReachedThreshold).toBe(0.8);
  });

  it('returns 0.5 when totalItems is 0', () => {
    const { result } = renderHook(() =>
      useSmartPagination({
        totalItems: 0,
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        config: defaultConfig,
      }),
    );
    expect(result.current.onEndReachedThreshold).toBe(0.5);
  });

  it('handleEndReached calls fetchNextPage when hasNextPage and not fetching', () => {
    const fetchNextPage = jest.fn();
    const { result } = renderHook(() =>
      useSmartPagination({
        totalItems: 20,
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
        config: defaultConfig,
      }),
    );

    result.current.handleEndReached();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('handleEndReached does NOT call fetchNextPage when no next page', () => {
    const fetchNextPage = jest.fn();
    const { result } = renderHook(() =>
      useSmartPagination({
        totalItems: 20,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage,
        config: defaultConfig,
      }),
    );

    result.current.handleEndReached();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('handleEndReached does NOT call fetchNextPage when already fetching', () => {
    const fetchNextPage = jest.fn();
    const { result } = renderHook(() =>
      useSmartPagination({
        totalItems: 20,
        hasNextPage: true,
        isFetchingNextPage: true,
        fetchNextPage,
        config: defaultConfig,
      }),
    );

    result.current.handleEndReached();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('uses different config prefetchItemsRemaining', () => {
    const config: SmartPaginationConfig = { ...defaultConfig, prefetchItemsRemaining: 3 };
    const { result } = renderHook(() =>
      useSmartPagination({
        totalItems: 30,
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        config,
      }),
    );
    // 3/30 = 0.1 → clamped to 0.2
    expect(result.current.onEndReachedThreshold).toBe(0.2);
  });
});
