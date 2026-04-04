import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';

describe('getQueryClient', () => {
  it('returns the same instance on repeated calls in the browser', () => {
    // In jsdom environment, window is defined, so this should return a singleton
    const first = getQueryClient();
    const second = getQueryClient();
    expect(first).toBe(second);
    expect(first).toBeInstanceOf(QueryClient);
  });
});
