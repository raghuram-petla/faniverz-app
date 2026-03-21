'use client';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

// @contract consumers must be wrapped in SidebarProvider; throws if used outside
export const SidebarContext = createContext<SidebarState | null>(null);

export function useSidebarState(): SidebarState {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebarState must be used within SidebarProvider');
  return ctx;
}

// @sideeffect reads/writes localStorage key 'sidebar-collapsed'
export function useSidebarProvider(): SidebarState {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);
}
