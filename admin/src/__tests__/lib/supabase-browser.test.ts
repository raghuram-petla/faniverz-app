/**
 * Tests for supabase-browser.ts — browser-side Supabase client with timeout.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    vi.unstubAllGlobals();
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

  it('aborts fetch after 10 seconds', async () => {
    let capturedSignal: AbortSignal | undefined;
    const mockFetch = vi.fn().mockImplementation((_url: unknown, init: RequestInit) => {
      capturedSignal = init.signal ?? undefined;
      return new Promise<Response>(() => {}); // never resolves
    });
    vi.stubGlobal('fetch', mockFetch);

    await import('../../lib/supabase-browser');
    const globalConfig = capturedOptions?.global as Record<string, unknown>;
    const fetchWithTimeout = globalConfig.fetch as typeof fetch;

    void fetchWithTimeout('https://test.supabase.co/auth/v1/token', {});

    expect(capturedSignal?.aborted).toBe(false);

    // Advance past 10s timeout
    await vi.advanceTimersByTimeAsync(10001);

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('clears timeout after fetch completes', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    await import('../../lib/supabase-browser');
    const globalConfig = capturedOptions?.global as Record<string, unknown>;
    const fetchWithTimeout = globalConfig.fetch as typeof fetch;

    await fetchWithTimeout('https://test.supabase.co/auth/v1/token', {});

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('propagates caller abort signal to internal AbortController', async () => {
    let capturedSignal: AbortSignal | undefined;
    const mockFetch = vi.fn().mockImplementation((_url: unknown, init: RequestInit) => {
      capturedSignal = init.signal ?? undefined;
      return new Promise<Response>(() => {}); // never resolves
    });
    vi.stubGlobal('fetch', mockFetch);

    await import('../../lib/supabase-browser');
    const globalConfig = capturedOptions?.global as Record<string, unknown>;
    const fetchWithTimeout = globalConfig.fetch as typeof fetch;

    // Create a caller-controlled abort controller
    const callerController = new AbortController();
    void fetchWithTimeout('https://test.supabase.co/auth/v1/token', {
      signal: callerController.signal,
    });

    // Internal signal should be active
    expect(capturedSignal?.aborted).toBe(false);

    // Abort from caller
    callerController.abort();

    // Internal signal should be aborted
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('passes the internal AbortController signal to fetch (not caller signal)', async () => {
    const callerController = new AbortController();
    let capturedSignal: AbortSignal | undefined;
    const mockFetch = vi.fn().mockImplementation((_url: unknown, init: RequestInit) => {
      capturedSignal = init.signal ?? undefined;
      return Promise.resolve(new Response('ok'));
    });
    vi.stubGlobal('fetch', mockFetch);

    await import('../../lib/supabase-browser');
    const globalConfig = capturedOptions?.global as Record<string, unknown>;
    const fetchWithTimeout = globalConfig.fetch as typeof fetch;

    await fetchWithTimeout('https://test.supabase.co/auth/v1/token', {
      signal: callerController.signal,
    });

    // The signal passed to fetch should NOT be the caller's signal
    // (it's the internal AbortController's signal)
    expect(capturedSignal).not.toBe(callerController.signal);
  });

  it('works without a caller signal (no onCallerAbort registered)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    await import('../../lib/supabase-browser');
    const globalConfig = capturedOptions?.global as Record<string, unknown>;
    const fetchWithTimeout = globalConfig.fetch as typeof fetch;

    // No init.signal — should work fine
    const result = await fetchWithTimeout('https://test.supabase.co/auth/v1/token');
    expect(result).toBeDefined();
  });

  it('passes init options (method, body, headers) to underlying fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    await import('../../lib/supabase-browser');
    const globalConfig = capturedOptions?.global as Record<string, unknown>;
    const fetchWithTimeout = globalConfig.fetch as typeof fetch;

    await fetchWithTimeout('https://test.supabase.co/rest/v1/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"test":true}',
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"test":true}');
  });
});
