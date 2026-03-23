jest.mock('../searchApi', () => ({
  searchAll: jest.fn().mockResolvedValue({ movies: [], actors: [], productionHouses: [] }),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useUniversalSearch } from '../searchHooks';
import { searchAll } from '../searchApi';
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
