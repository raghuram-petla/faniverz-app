import { renderHook, act } from '@testing-library/react-native';
import { useRefresh } from '../useRefresh';

describe('useRefresh', () => {
  it('returns refreshing false initially', () => {
    const { result } = renderHook(() => useRefresh(jest.fn()));
    expect(result.current.refreshing).toBe(false);
  });

  it('sets refreshing to true then false during onRefresh', async () => {
    const refetchFn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRefresh(refetchFn));

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(refetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(false);
  });

  it('calls all refetch functions in parallel', async () => {
    const fn1 = jest.fn().mockResolvedValue('a');
    const fn2 = jest.fn().mockResolvedValue('b');
    const fn3 = jest.fn().mockResolvedValue('c');
    const { result } = renderHook(() => useRefresh(fn1, fn2, fn3));

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn3).toHaveBeenCalledTimes(1);
  });

  it('handles refetch rejection gracefully and resets refreshing', async () => {
    const fn1 = jest.fn().mockResolvedValue('ok');
    const fn2 = jest.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useRefresh(fn1, fn2));

    await act(async () => {
      try {
        await result.current.onRefresh();
      } catch {
        // expected
      }
    });

    expect(fn1).toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();
    // Critical: refreshing must reset even when a refetch rejects
    expect(result.current.refreshing).toBe(false);
  });

  it('works with zero refetch functions', async () => {
    const { result } = renderHook(() => useRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });
});
