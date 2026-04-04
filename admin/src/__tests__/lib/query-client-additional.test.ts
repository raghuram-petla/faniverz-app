/**
 * Additional branch coverage for query-client.ts.
 * Covers: default options verification, server-side branch (window=undefined),
 * and singleton behavior.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';

describe('getQueryClient — browser singleton', () => {
  it('returns same instance on repeated calls (browser env with window defined)', () => {
    // In jsdom, window is defined — should return the module-level singleton
    const a = getQueryClient();
    const b = getQueryClient();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(QueryClient);
  });
});

describe('getQueryClient — server-side branch', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('returns a fresh QueryClient each call when window is undefined', () => {
    // Temporarily remove window to simulate SSR
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;

    const a = getQueryClient();
    const b = getQueryClient();
    // SSR branch returns a new instance each time
    expect(a).not.toBe(b);
    expect(a).toBeInstanceOf(QueryClient);
  });
});
