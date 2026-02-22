import { describe, it, expect } from 'vitest';
import { queryClient } from '@/lib/query-client';

describe('queryClient', () => {
  it('should have 30s staleTime for admin freshness', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
  });

  it('should have retry set to 1', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
  });

  it('should refetch on window focus', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
  });
});
