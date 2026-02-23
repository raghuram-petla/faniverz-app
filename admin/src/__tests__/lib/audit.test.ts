import { describe, it, expect, vi } from 'vitest';

const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

import { logAdminAction } from '@/lib/audit';
import { supabaseAdmin } from '@/lib/supabase-admin';

describe('logAdminAction', () => {
  it('calls supabase.from("audit_log").insert with correct arguments', async () => {
    await logAdminAction('user-123', 'create', 'movie', 'movie-456', { title: 'Test Movie' });

    expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_log');
    expect(mockInsert).toHaveBeenCalledWith({
      admin_user_id: 'user-123',
      action: 'create',
      entity_type: 'movie',
      entity_id: 'movie-456',
      details: { title: 'Test Movie' },
    });
  });

  it('defaults details to empty object when not provided', async () => {
    mockInsert.mockClear();
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockClear();

    await logAdminAction('user-789', 'delete', 'notification', 'notif-001');

    expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_log');
    expect(mockInsert).toHaveBeenCalledWith({
      admin_user_id: 'user-789',
      action: 'delete',
      entity_type: 'notification',
      entity_id: 'notif-001',
      details: {},
    });
  });
});
