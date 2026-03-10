import { renderHook, act } from '@testing-library/react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial empty strings', () => {
    const { result } = renderHook(() => useDebouncedSearch());
    expect(result.current.search).toBe('');
    expect(result.current.debouncedSearch).toBe('');
  });

  it('updates search immediately on setSearch', () => {
    const { result } = renderHook(() => useDebouncedSearch());
    act(() => result.current.setSearch('hello'));
    expect(result.current.search).toBe('hello');
    expect(result.current.debouncedSearch).toBe('');
  });

  it('debounces debouncedSearch by 300ms', () => {
    const { result } = renderHook(() => useDebouncedSearch());
    act(() => result.current.setSearch('test'));
    expect(result.current.debouncedSearch).toBe('');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current.debouncedSearch).toBe('test');
  });

  it('trims whitespace from debounced value', () => {
    const { result } = renderHook(() => useDebouncedSearch());
    act(() => result.current.setSearch('  hello  '));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.debouncedSearch).toBe('hello');
  });

  it('accepts custom delay', () => {
    const { result } = renderHook(() => useDebouncedSearch(500));
    act(() => result.current.setSearch('custom'));

    act(() => vi.advanceTimersByTime(300));
    expect(result.current.debouncedSearch).toBe('');

    act(() => vi.advanceTimersByTime(200));
    expect(result.current.debouncedSearch).toBe('custom');
  });

  it('resets debounce timer on rapid changes', () => {
    const { result } = renderHook(() => useDebouncedSearch());
    act(() => result.current.setSearch('a'));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.setSearch('ab'));
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.debouncedSearch).toBe('');

    act(() => vi.advanceTimersByTime(100));
    expect(result.current.debouncedSearch).toBe('ab');
  });
});
