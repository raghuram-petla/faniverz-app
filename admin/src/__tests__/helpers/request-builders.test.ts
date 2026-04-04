import { describe, it, expect, vi } from 'vitest';
import { makeNextRequest, makeRouteWrapperCtx } from './request-builders';

describe('makeNextRequest', () => {
  it('creates a NextRequest with POST method', async () => {
    const req = makeNextRequest('http://localhost/api/test', { foo: 'bar' });
    const body = await req.json();
    expect(body).toEqual({ foo: 'bar' });
  });

  it('sets default Authorization header to Bearer tok', () => {
    const req = makeNextRequest('http://localhost/api/test', {});
    expect(req.headers.get('authorization')).toBe('Bearer tok');
  });

  it('allows overriding the auth header', () => {
    const req = makeNextRequest('http://localhost/api/test', {}, { authHeader: 'Bearer custom' });
    expect(req.headers.get('authorization')).toBe('Bearer custom');
  });

  it('sets Content-Type to application/json', () => {
    const req = makeNextRequest('http://localhost/api/test', {});
    expect(req.headers.get('content-type')).toBe('application/json');
  });
});

describe('makeRouteWrapperCtx', () => {
  it('creates context with req, supabase, auth, and apiKey', async () => {
    const mockFrom = vi.fn();
    const supabase = { from: mockFrom };
    const ctx = makeRouteWrapperCtx('http://localhost/api/sync', { tmdbId: 1 }, supabase as never);
    const body = await (ctx.req as Request).json();
    expect(body).toEqual({ tmdbId: 1 });
    expect(ctx.supabase).toBe(supabase);
    expect((ctx.auth as { user: { id: string } }).user.id).toBe('admin-1');
    expect((ctx.auth as { role: string }).role).toBe('admin');
    expect(ctx.apiKey).toBe('tmdb-key');
  });

  it('uses provided userId and role', () => {
    const mockFrom = vi.fn();
    const supabase = { from: mockFrom };
    const ctx = makeRouteWrapperCtx('http://localhost/api/sync', {}, supabase as never, {
      userId: 'super-user',
      role: 'super_admin',
    });
    expect((ctx.auth as { user: { id: string } }).user.id).toBe('super-user');
    expect((ctx.auth as { role: string }).role).toBe('super_admin');
  });

  it('omits apiKey when includeApiKey is false', () => {
    const mockFrom = vi.fn();
    const supabase = { from: mockFrom };
    const ctx = makeRouteWrapperCtx('http://localhost/api/validations', {}, supabase as never, {
      includeApiKey: false,
    });
    expect(ctx.apiKey).toBeUndefined();
  });
});
