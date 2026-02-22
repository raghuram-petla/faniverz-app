import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
    auth: {
      getUser: mockGetUser,
    },
  },
}));

describe('logAdminAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert an audit log entry', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });

    const { logAdminAction } = await import('@/lib/audit');
    await logAdminAction('create', 'movie', 42, { title: 'Test' });

    expect(mockInsert).toHaveBeenCalledWith({
      admin_user_id: 'user-123',
      action: 'create',
      entity_type: 'movie',
      entity_id: 42,
      changes: { title: 'Test' },
    });
  });

  it('should not insert if no user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const { logAdminAction } = await import('@/lib/audit');
    await logAdminAction('update', 'movie', 1);

    expect(mockInsert).not.toHaveBeenCalled();
  });
});
