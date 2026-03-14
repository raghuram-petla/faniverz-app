import { renderHook, act } from '@testing-library/react';
import { useSidebarProvider } from '@/hooks/useSidebarState';

describe('useSidebarProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to expanded (collapsed = false)', () => {
    const { result } = renderHook(() => useSidebarProvider());
    expect(result.current.collapsed).toBe(false);
  });

  it('toggles collapsed state', () => {
    const { result } = renderHook(() => useSidebarProvider());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.collapsed).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.collapsed).toBe(false);
  });

  it('persists collapsed state to localStorage', () => {
    const { result } = renderHook(() => useSidebarProvider());

    act(() => {
      result.current.toggle();
    });

    expect(localStorage.getItem('sidebar-collapsed')).toBe('true');

    act(() => {
      result.current.toggle();
    });

    expect(localStorage.getItem('sidebar-collapsed')).toBe('false');
  });

  it('reads initial state from localStorage', () => {
    localStorage.setItem('sidebar-collapsed', 'true');
    const { result } = renderHook(() => useSidebarProvider());

    // useEffect runs async, so the initial render is false, then it reads localStorage
    expect(result.current.collapsed).toBe(true);
  });
});
