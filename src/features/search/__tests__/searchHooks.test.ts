jest.mock('../searchApi', () => ({
  searchAll: jest.fn().mockResolvedValue({ movies: [], actors: [], productionHouses: [] }),
  searchMoviesPaginated: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/hooks/useSmartInfiniteQuery', () => ({
  useSmartInfiniteQuery: jest.fn(() => ({
    allItems: [],
    isLoading: false,
    isLoadingMore: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
  })),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useUniversalSearch, useSearchMoviesPaginated } from '../searchHooks';
import { searchAll, searchMoviesPaginated } from '../searchApi';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { createWrapper } from '@/__tests__/helpers/createWrapper';

describe('useUniversalSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not search when query is too short', () => {
    renderHook(() => useUniversalSearch('a'), { wrapper: createWrapper() });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(searchAll).not.toHaveBeenCalled();
  });

  it('searches when debounced query length >= 2', async () => {
    const { result } = renderHook(() => useUniversalSearch('ab'), { wrapper: createWrapper() });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchAll).toHaveBeenCalledWith('ab');
  });

  // @contract: debounce prevents rapid keystroke bursts from firing searchAll on every character change.
  // When query changes rapidly, only the final stable value after 300ms triggers a new searchAll call.
  it('cancels pending debounce when query changes rapidly', async () => {
    const { rerender } = renderHook(({ q }: { q: string }) => useUniversalSearch(q), {
      wrapper: createWrapper(),
      initialProps: { q: 'ab' },
    });
    // Advance past first debounce to get initial searchAll call
    act(() => {
      jest.advanceTimersByTime(300);
    });
    const callCountAfterFirst = (searchAll as jest.Mock).mock.calls.length;

    // Simulate rapid typing: 'abc' then 'abcd' within 300ms
    rerender({ q: 'abc' });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ q: 'abcd' });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    // Only 100ms elapsed since last change — debounce hasn't fired yet
    expect((searchAll as jest.Mock).mock.calls.length).toBe(callCountAfterFirst);

    // Advance remaining 200ms — now the debounce fires for 'abcd'
    act(() => {
      jest.advanceTimersByTime(200);
    });
    await waitFor(() =>
      expect((searchAll as jest.Mock).mock.calls.length).toBe(callCountAfterFirst + 1),
    );
    // Should have been called with the final query, not intermediate ones
    expect(searchAll).toHaveBeenLastCalledWith('abcd');
  });

  it('calls searchAll only once after debounce delay even if query is stable', async () => {
    const { result } = renderHook(({ q }: { q: string }) => useUniversalSearch(q), {
      wrapper: createWrapper(),
      initialProps: { q: 'pushpa' },
    });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchAll).toHaveBeenCalledTimes(1);
    expect(searchAll).toHaveBeenCalledWith('pushpa');
  });
});

describe('useSearchMoviesPaginated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not query when debounced query length < 2', () => {
    renderHook(() => useSearchMoviesPaginated('a'), { wrapper: createWrapper() });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    const calls = (useSmartInfiniteQuery as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.enabled).toBe(false);
  });

  it('enables query when debounced query length >= 2', async () => {
    renderHook(() => useSearchMoviesPaginated('ab'), { wrapper: createWrapper() });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      const calls = (useSmartInfiniteQuery as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.enabled).toBe(true);
    });
  });

  it('passes the debounced query to queryFn', async () => {
    renderHook(() => useSearchMoviesPaginated('pushpa'), { wrapper: createWrapper() });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    const calls = (useSmartInfiniteQuery as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    // Call the queryFn to verify it delegates to searchMoviesPaginated
    lastCall.queryFn(0, 10);
    expect(searchMoviesPaginated).toHaveBeenCalledWith('pushpa', 0, 10);
  });

  it('uses search-movies query key with debounced query', () => {
    renderHook(() => useSearchMoviesPaginated('pushpa'), { wrapper: createWrapper() });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    const calls = (useSmartInfiniteQuery as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.queryKey).toEqual(['search-movies', 'pushpa']);
  });

  it('debounces: rapid typing only fires with final query', async () => {
    const { rerender } = renderHook(({ q }: { q: string }) => useSearchMoviesPaginated(q), {
      wrapper: createWrapper(),
      initialProps: { q: 'ab' },
    });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    const countAfterFirst = (useSmartInfiniteQuery as jest.Mock).mock.calls.length;
    rerender({ q: 'abc' });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ q: 'abcd' });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect((useSmartInfiniteQuery as jest.Mock).mock.calls.length).toBe(countAfterFirst + 2); // renders happened but query not yet settled
    act(() => {
      jest.advanceTimersByTime(300);
    });
    const finalCalls = (useSmartInfiniteQuery as jest.Mock).mock.calls;
    const lastCall = finalCalls[finalCalls.length - 1][0];
    expect(lastCall.queryKey).toEqual(['search-movies', 'abcd']);
  });
});
