import { useState, useEffect } from 'react';

// @contract: Returns a debounced copy of `value` that only updates after `delay` ms of inactivity.
// Cleans up the timer on unmount or when value/delay changes, preventing stale updates.
// @assumes: delay is a stable positive integer — changing delay resets the timer and restarts the debounce window.
// @edge: if the component unmounts while the timer is pending, the clearTimeout in the cleanup
// prevents a setState on an unmounted component.
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  // @sideeffect: schedules a timer to update debouncedValue; cancels any pending timer on re-run
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
