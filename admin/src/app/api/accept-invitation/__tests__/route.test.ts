import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockReadSupabase = { from: mockFrom };
const mockAuditableSupabase = { from: mockFrom };

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(() => mockReadSupabase),
  getAuditableSupabaseAdmin: vi.fn(() => mockAuditableSupabase),
}));

vi.mock('@/lib/sync-helpers', () => ({
  verifyBearer: vi.fn(),
  unauthorizedResponse: vi.fn(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),
  // @contract: shared error response helpers used by the route
  badRequest: vi.fn((message: string) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: message }, { status: 400 });
  }),
  notFound: vi.fn((message: string) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: message }, { status: 404 });
  }),
}));

import { POST } from '@/app/api/accept-invitation/route';
import { getAuditableSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyBearer } from '@/lib/sync-helpers';
import { makeNextRequest } from '@/__tests__/helpers/request-builders';

// @coupling Uses shared makeNextRequest helper to build real NextRequest objects.
function makeRequest(body: Record<string, unknown>) {
  return makeNextRequest('http://localhost/api/accept-invitation', body);
}

describe('POST /api/accept-invitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyBearer).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    } as never);
  });

  it('returns 401 when bearer token is invalid', async () => {
    vi.mocked(verifyBearer).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: 'test@example.com', userId: 'user-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when email or userId is missing', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when identity mismatch', async () => {
    const res = await POST(makeRequest({ email: 'other@example.com', userId: 'user-1' }));
    expect(res.status).toBe(403);
  });

  it('uses auditable supabase client with accepting user id', async () => {
    // Mock: no pending invitation
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi
                    .fn()
                    .mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const res = await POST(makeRequest({ email: 'test@example.com', userId: 'user-1' }));
    expect(res.status).toBe(404);
    // Auditable client should have been created even though invitation was not found
    expect(getAuditableSupabaseAdmin).toHaveBeenCalledWith('user-1');
  });

  it('accepts invitation and creates role assignment', async () => {
    // Mock: pending invitation found, no existing role
    const mockSelect = vi.fn();
    const invitationData = {
      id: 'inv-1',
      role_id: 'admin',
      invited_by: 'super-1',
      production_house_ids: null,
    };

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_invitations') {
        if (callCount === 0) {
          callCount++;
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: invitationData, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        if (mockSelect.mock.calls.length === 0) {
          mockSelect.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          });
          return { select: mockSelect, insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
    });

    const res = await POST(makeRequest({ email: 'test@example.com', userId: 'user-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe('admin');
  });
});
