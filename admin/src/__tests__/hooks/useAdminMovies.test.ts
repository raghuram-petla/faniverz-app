import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockSelect = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockReturnThis();
const mockOr = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      order: mockOrder,
      limit: mockLimit,
      or: mockOr,
      eq: mockEq,
      single: mockSingle,
    })),
  },
}));

vi.mock('@/lib/audit', () => ({
  logAdminAction: vi.fn(),
}));

describe('useAdminMovies hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export required hook functions', async () => {
    const mod = await import('@/hooks/useAdminMovies');
    expect(mod.useAdminMovies).toBeDefined();
    expect(mod.useAdminMovieDetail).toBeDefined();
    expect(mod.useUpdateMovie).toBeDefined();
    expect(mod.useCreateMovie).toBeDefined();
  });
});
