import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('useAdminSync hooks', () => {
  it('should export required hook functions', async () => {
    const mod = await import('@/hooks/useAdminSync');
    expect(mod.useAdminSyncLogs).toBeDefined();
    expect(mod.useTriggerSync).toBeDefined();
  });
});
