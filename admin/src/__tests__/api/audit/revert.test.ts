import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

const mockVerifyAdminCanMutate = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/sync-helpers', () => ({
  verifyAdminCanMutate: (...args: unknown[]) => mockVerifyAdminCanMutate(...args),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/audit/revert/route';

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminCanMutate.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
});

describe('POST /api/audit/revert', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerifyAdminCanMutate.mockResolvedValue(null);
    const res = await POST(makeRequest({ auditEntryId: 'entry-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockVerifyAdminCanMutate.mockResolvedValue('viewer_readonly');
    const res = await POST(makeRequest({ auditEntryId: 'entry-1' }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Viewer role is read-only');
  });

  it('returns 400 when auditEntryId is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing auditEntryId');
  });

  it('calls rpc with correct parameters on success', async () => {
    mockRpc.mockResolvedValue({ data: { reverted: true }, error: null });
    const res = await POST(makeRequest({ auditEntryId: 'entry-123' }));
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('revert_audit_entry', {
      p_admin_id: 'admin-1',
      p_entry_id: 'entry-123',
    });
    const json = await res.json();
    expect(json).toEqual({ reverted: true });
  });

  it('returns 500 when rpc fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const res = await POST(makeRequest({ auditEntryId: 'entry-1' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('DB error');
  });

  it('returns 500 on unexpected exception', async () => {
    mockVerifyAdminCanMutate.mockRejectedValue(new Error('boom'));
    const res = await POST(makeRequest({ auditEntryId: 'entry-1' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});
