import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/audit', () => ({
  logAdminAction: vi.fn(),
}));

describe('useAdminPlatforms hooks', () => {
  it('should export required hook functions', async () => {
    const mod = await import('@/hooks/useAdminPlatforms');
    expect(mod.useAdminPlatforms).toBeDefined();
    expect(mod.useCreatePlatform).toBeDefined();
    expect(mod.useUpdatePlatform).toBeDefined();
    expect(mod.useDeletePlatform).toBeDefined();
    expect(mod.useReorderPlatforms).toBeDefined();
  });
});
