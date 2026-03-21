/**
 * Tests for supabase-browser.ts — browser-side Supabase client with timeout.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

let capturedOptions: Record<string, unknown> | undefined;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((_url: string, _key: string, options?: Record<string, unknown>) => {
    capturedOptions = options;
    return {
      from: vi.fn(),
      auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() },
    };
  }),
}));

describe('supabase browser client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    capturedOptions = undefined;
  });

  it('creates client with autoRefreshToken disabled', async () => {
    await import('../../lib/supabase-browser');

    expect(capturedOptions).toBeDefined();
    expect((capturedOptions?.auth as Record<string, unknown>)?.autoRefreshToken).toBe(false);
  });

  it('provides a custom fetch function for timeout', async () => {
    await import('../../lib/supabase-browser');

    expect(capturedOptions?.global).toBeDefined();
    const globalConfig = capturedOptions?.global as Record<string, unknown>;
    expect(typeof globalConfig.fetch).toBe('function');
  });

  it('exports supabase as a named export', async () => {
    const mod = await import('../../lib/supabase-browser');
    expect(mod.supabase).toBeDefined();
  });
});

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('wraps fetch with AbortController timeout', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    await import('../../lib/supabase-browser');

    const globalConfig = capturedOptions?.global as Record<string, unknown>;
    const fetchWithTimeout = globalConfig.fetch as typeof fetch;

    // Call the wrapped fetch
    const promise = fetchWithTimeout('https://test.supabase.co/auth/v1/token', {});

    // Advance timers slightly to let the fetch resolve
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;
    expect(result).toBeDefined();
    expect(mockFetch).toHaveBeenCalled();
  });
});
