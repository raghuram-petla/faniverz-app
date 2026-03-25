import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createContext } from 'react';

// Must import after setting up mocks
import { useSidebarState, useSidebarProvider, SidebarContext } from '@/hooks/useSidebarState';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('useSidebarProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('starts with collapsed = false when nothing in localStorage', () => {
    localStorageMock.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useSidebarProvider());
    expect(result.current.collapsed).toBe(false);
  });

  it('reads collapsed = true from localStorage on mount', async () => {
    localStorageMock.getItem.mockReturnValue('true');
    const { result } = renderHook(() => useSidebarProvider());
    // useEffect runs after initial render
    await act(async () => {});
    expect(result.current.collapsed).toBe(true);
  });

  it('does not collapse if localStorage has "false"', async () => {
    localStorageMock.getItem.mockReturnValue('false');
    const { result } = renderHook(() => useSidebarProvider());
    await act(async () => {});
    expect(result.current.collapsed).toBe(false);
  });

  it('toggle flips collapsed from false to true', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useSidebarProvider());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.collapsed).toBe(true);
  });

  it('toggle flips collapsed from true to false', async () => {
    localStorageMock.getItem.mockReturnValue('true');
    const { result } = renderHook(() => useSidebarProvider());
    await act(async () => {});

    act(() => {
      result.current.toggle();
    });

    expect(result.current.collapsed).toBe(false);
  });

  it('toggle writes new state to localStorage', () => {
    localStorageMock.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useSidebarProvider());

    act(() => {
      result.current.toggle();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('sidebar-collapsed', 'true');
  });

  it('toggle back writes false to localStorage', async () => {
    localStorageMock.getItem.mockReturnValue('true');
    const { result } = renderHook(() => useSidebarProvider());
    await act(async () => {});

    act(() => {
      result.current.toggle();
    });

    expect(localStorageMock.setItem).toHaveBeenLastCalledWith('sidebar-collapsed', 'false');
  });

  it('returns stable toggle reference across renders', () => {
    localStorageMock.getItem.mockReturnValue(null);
    const { result, rerender } = renderHook(() => useSidebarProvider());
    const firstToggle = result.current.toggle;

    rerender();

    expect(result.current.toggle).toBe(firstToggle);
  });
});

describe('useSidebarState', () => {
  it('throws when used outside SidebarProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useSidebarState());
    }).toThrow('useSidebarState must be used within SidebarProvider');
    consoleSpy.mockRestore();
  });

  it('returns context value when inside SidebarProvider', () => {
    const mockState = { collapsed: true, toggle: vi.fn() };

    const { result } = renderHook(() => useSidebarState(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        // Use createElement to avoid JSX in test file
        React.createElement(SidebarContext.Provider, { value: mockState }, children),
    });

    expect(result.current.collapsed).toBe(true);
    expect(result.current.toggle).toBe(mockState.toggle);
  });
});

import React from 'react';
