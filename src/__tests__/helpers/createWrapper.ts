import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * @contract Creates a QueryClientProvider wrapper for renderHook tests.
 * Each call creates a fresh QueryClient with retry disabled.
 */
export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}
