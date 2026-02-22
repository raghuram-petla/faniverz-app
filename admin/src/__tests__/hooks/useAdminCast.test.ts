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
      or: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/audit', () => ({
  logAdminAction: vi.fn(),
}));

describe('useAdminCast hooks', () => {
  it('should export required hook functions', async () => {
    const mod = await import('@/hooks/useAdminCast');
    expect(mod.useAdminCast).toBeDefined();
    expect(mod.useAdminCastDetail).toBeDefined();
    expect(mod.useUpdateCast).toBeDefined();
    expect(mod.useMovieCast).toBeDefined();
    expect(mod.useAddCastToMovie).toBeDefined();
    expect(mod.useRemoveCastFromMovie).toBeDefined();
  });
});
