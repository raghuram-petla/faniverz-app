import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/audit', () => ({
  logAdminAction: vi.fn(),
}));

describe('useAdminNotifications hooks', () => {
  it('should export required hook functions', async () => {
    const mod = await import('@/hooks/useAdminNotifications');
    expect(mod.useAdminNotifications).toBeDefined();
    expect(mod.useNotificationStats).toBeDefined();
    expect(mod.useCancelNotification).toBeDefined();
    expect(mod.useRetryNotification).toBeDefined();
    expect(mod.useBulkRetryFailed).toBeDefined();
    expect(mod.useBulkCancelPending).toBeDefined();
    expect(mod.useComposeNotification).toBeDefined();
  });
});
