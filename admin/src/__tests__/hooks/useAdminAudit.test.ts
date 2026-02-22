import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('useAdminAudit hooks', () => {
  it('should export required hook functions', async () => {
    const mod = await import('@/hooks/useAdminAudit');
    expect(mod.useAdminAuditLog).toBeDefined();
  });
});
