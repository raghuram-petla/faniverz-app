import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/audit', () => ({
  logAdminAction: vi.fn(),
}));

describe('useAdminOtt hooks', () => {
  it('should export required hook functions', async () => {
    const mod = await import('@/hooks/useAdminOtt');
    expect(mod.useAdminOttReleases).toBeDefined();
    expect(mod.useAdminOttDetail).toBeDefined();
    expect(mod.useCreateOttRelease).toBeDefined();
    expect(mod.useUpdateOttRelease).toBeDefined();
    expect(mod.useDeleteOttRelease).toBeDefined();
  });
});
