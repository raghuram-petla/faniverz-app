import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockSupabase = { from: vi.fn() };

vi.mock('@/lib/supabase-admin', () => ({
  getAuditableSupabaseAdmin: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/sync-helpers', () => ({
  ensureAdminMutateAuth: vi.fn(),
  verifyAdminCanMutate: vi.fn(),
  errorResponse: vi.fn((_label: string, err: unknown) =>
    NextResponse.json({ error: err instanceof Error ? err.message : 'fail' }, { status: 500 }),
  ),
  viewerReadonlyResponse: vi.fn(() => NextResponse.json({ error: 'Viewer' }, { status: 403 })),
  unauthorizedResponse: vi.fn(() => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })),
}));

import { withSyncAdmin, withMutationAdmin } from '../route-wrappers';
import { getAuditableSupabaseAdmin } from '@/lib/supabase-admin';
import { ensureAdminMutateAuth, verifyAdminCanMutate } from '@/lib/sync-helpers';

function makeReq() {
  return new NextRequest('http://localhost/test', {
    method: 'POST',
    headers: { Authorization: 'Bearer tok' },
  });
}

describe('withSyncAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error response when auth fails', async () => {
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const handler = vi.fn();
    const route = withSyncAdmin('Test', handler);
    const res = await route(makeReq());
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('creates auditable client and calls handler with context', async () => {
    const mockAuth = { user: { id: 'admin-1' } as never, role: 'admin' };
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: true,
      auth: mockAuth,
      apiKey: 'tmdb-key',
    });
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const route = withSyncAdmin('Test', handler);
    const res = await route(makeReq());

    expect(res.status).toBe(200);
    expect(getAuditableSupabaseAdmin).toHaveBeenCalledWith('admin-1');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase: mockSupabase,
        auth: mockAuth,
        apiKey: 'tmdb-key',
      }),
    );
  });

  it('catches unhandled errors and returns errorResponse', async () => {
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: true,
      auth: { user: { id: 'admin-1' } as never, role: 'admin' },
      apiKey: 'key',
    });
    const handler = vi.fn().mockRejectedValue(new Error('boom'));

    const route = withSyncAdmin('Test', handler);
    const res = await route(makeReq());
    expect(res.status).toBe(500);
  });
});

describe('withMutationAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when auth fails', async () => {
    vi.mocked(verifyAdminCanMutate).mockResolvedValue(null);
    const handler = vi.fn();
    const route = withMutationAdmin('Test', handler);
    const res = await route(makeReq());
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 for viewer role', async () => {
    vi.mocked(verifyAdminCanMutate).mockResolvedValue('viewer_readonly');
    const handler = vi.fn();
    const route = withMutationAdmin('Test', handler);
    const res = await route(makeReq());
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('creates auditable client and calls handler with context', async () => {
    const mockAuth = { user: { id: 'admin-2' } as never, role: 'super_admin' };
    vi.mocked(verifyAdminCanMutate).mockResolvedValue(mockAuth);
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const route = withMutationAdmin('Test', handler);
    const res = await route(makeReq());

    expect(res.status).toBe(200);
    expect(getAuditableSupabaseAdmin).toHaveBeenCalledWith('admin-2');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase: mockSupabase,
        auth: mockAuth,
      }),
    );
  });

  it('catches unhandled errors and returns errorResponse', async () => {
    vi.mocked(verifyAdminCanMutate).mockResolvedValue({
      user: { id: 'admin-2' } as never,
      role: 'admin',
    });
    const handler = vi.fn().mockRejectedValue(new Error('crash'));

    const route = withMutationAdmin('Test', handler);
    const res = await route(makeReq());
    expect(res.status).toBe(500);
  });
});
