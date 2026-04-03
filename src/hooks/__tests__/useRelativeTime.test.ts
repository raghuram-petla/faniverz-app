import { renderHook, act } from '@testing-library/react-native';
import { useRelativeTime } from '../useRelativeTime';
import { formatRelativeTime } from '@/utils/formatDate';

jest.useFakeTimers();

describe('useRelativeTime', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('returns formatted relative time on initial render', () => {
    const date = new Date(Date.now() - 5 * 60_000).toISOString(); // 5 min ago
    const { result } = renderHook(() => useRelativeTime(date));
    expect(result.current).toBe('5m ago');
  });

  it('returns Unknown for null input', () => {
    const { result } = renderHook(() => useRelativeTime(null));
    expect(result.current).toBe('Unknown');
  });

  it('returns Unknown for undefined input', () => {
    const { result } = renderHook(() => useRelativeTime(undefined));
    expect(result.current).toBe('Unknown');
  });

  it('updates after interval for recent timestamps (< 1 min)', () => {
    const now = Date.now();
    const date = new Date(now).toISOString(); // just now
    const { result } = renderHook(() => useRelativeTime(date));
    expect(result.current).toBe('Just now');

    // Advance 15s — should refresh
    act(() => {
      jest.advanceTimersByTime(15_000);
    });
    // Still "Just now" since only 15s passed
    expect(result.current).toBe('Just now');
  });

  it('updates after interval for minute-range timestamps', () => {
    const date = new Date(Date.now() - 2 * 60_000).toISOString(); // 2 min ago
    const { result } = renderHook(() => useRelativeTime(date));
    expect(result.current).toBe('2m ago');

    // Advance 30s — interval fires, recalculates
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    // Now ~2.5 min ago, still shows 2m
    expect(result.current).toBe(formatRelativeTime(date));
  });

  it('does not set interval for old timestamps (days+)', () => {
    const date = new Date(Date.now() - 3 * 86_400_000).toISOString(); // 3 days ago
    const { result } = renderHook(() => useRelativeTime(date));
    expect(result.current).toBe('3d ago');

    // Advance a lot — no interval should fire
    act(() => {
      jest.advanceTimersByTime(600_000);
    });
    expect(result.current).toBe('3d ago');
  });

  it('does not set interval for null dateStr', () => {
    const { result } = renderHook(() => useRelativeTime(null));
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe('Unknown');
  });

  it('resets text when dateStr prop changes', () => {
    const date1 = new Date(Date.now() - 5 * 60_000).toISOString();
    const date2 = new Date(Date.now() - 120 * 60_000).toISOString(); // 2h ago

    const { result, rerender } = renderHook(({ d }: { d: string }) => useRelativeTime(d), {
      initialProps: { d: date1 },
    });
    expect(result.current).toBe('5m ago');

    rerender({ d: date2 });
    expect(result.current).toBe('2h ago');
  });

  it('cleans up interval on unmount', () => {
    const date = new Date(Date.now() - 30_000).toISOString(); // 30s ago
    const { unmount } = renderHook(() => useRelativeTime(date));
    const clearSpy = jest.spyOn(global, 'clearInterval');
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('uses 5-minute interval for hour-range timestamps', () => {
    const date = new Date(Date.now() - 3 * 3_600_000).toISOString(); // 3h ago
    const { result } = renderHook(() => useRelativeTime(date));
    expect(result.current).toBe('3h ago');

    // Advance 5 min — interval fires
    act(() => {
      jest.advanceTimersByTime(300_000);
    });
    expect(result.current).toBe(formatRelativeTime(date));
  });
});
