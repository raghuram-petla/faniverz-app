import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update value before the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    );

    rerender({ value: 'updated' });

    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(result.current).toBe('initial');
  });

  it('updates value after the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    );

    rerender({ value: 'updated' });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('resets timer on rapid changes and only applies the last value', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    act(() => { jest.advanceTimersByTime(100); });

    rerender({ value: 'c' });
    act(() => { jest.advanceTimersByTime(100); });

    rerender({ value: 'final' });
    // Only 200ms total since 'final' was set — still within the 300ms delay
    expect(result.current).toBe('a');

    act(() => { jest.advanceTimersByTime(300); });
    expect(result.current).toBe('final');
  });

  it('uses 300ms as default delay', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value),
      { initialProps: { value: 'start' } },
    );

    rerender({ value: 'end' });

    act(() => { jest.advanceTimersByTime(299); });
    expect(result.current).toBe('start');

    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current).toBe('end');
  });

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useDebounce(value, 200),
      { initialProps: { value: 0 } },
    );

    rerender({ value: 42 });

    act(() => { jest.advanceTimersByTime(200); });
    expect(result.current).toBe(42);
  });

  it('works with object values', () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 2 };
    const { result, rerender } = renderHook(
      ({ value }: { value: { a: number } }) => useDebounce(value, 100),
      { initialProps: { value: obj1 } },
    );

    rerender({ value: obj2 });

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current).toEqual({ a: 2 });
  });
});
