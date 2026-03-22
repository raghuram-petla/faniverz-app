/**
 * Additional branch coverage for query-client.ts.
 * Covers: default options verification, server-side branch (window=undefined),
 * and singleton behavior.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient, getQueryClient } from '@/lib/query-client';

describe('makeQueryClient — default options', () => {
  it('returns a QueryClient instance', () => {
    expect(makeQueryClient()).toBeInstanceOf(QueryClient);
  });

  it('each call returns a new instance', () => {
    expect(makeQueryClient()).not.toBe(makeQueryClient());
  });

  it('configures staleTime to 5 minutes', () => {
    const client = makeQueryClient();
    // Access defaults via the internal options store
    // @ts-expect-error accessing internal options for testing
    const staleTime = client.getDefaultOptions()?.queries?.staleTime;
    expect(staleTime).toBe(5 * 60 * 1000);
  });

  it('configures gcTime to 10 minutes', () => {
    const client = makeQueryClient();
    // @ts-expect-error accessing internal options for testing
    const gcTime = client.getDefaultOptions()?.queries?.gcTime;
    expect(gcTime).toBe(10 * 60 * 1000);
  });

  it('disables refetchOnWindowFocus', () => {
    const client = makeQueryClient();
    // @ts-expect-error accessing internal options for testing
    const refetchOnWindowFocus = client.getDefaultOptions()?.queries?.refetchOnWindowFocus;
    expect(refetchOnWindowFocus).toBe(false);
  });

  it('disables refetchOnReconnect', () => {
    const client = makeQueryClient();
    // @ts-expect-error accessing internal options for testing
    const refetchOnReconnect = client.getDefaultOptions()?.queries?.refetchOnReconnect;
    expect(refetchOnReconnect).toBe(false);
  });

  it('sets retry to 1', () => {
    const client = makeQueryClient();
    // @ts-expect-error accessing internal options for testing
    const retry = client.getDefaultOptions()?.queries?.retry;
    expect(retry).toBe(1);
  });
});

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
