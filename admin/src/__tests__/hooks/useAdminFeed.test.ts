import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  },
}));

import {
  useAdminFeed,
  useAdminFeedItem,
  useCreateFeedItem,
  useUpdateFeedItem,
  useDeleteFeedItem,
  useTogglePinFeed,
  useToggleFeatureFeed,
  useReorderFeed,
} from '@/hooks/useAdminFeed';

describe('useAdminFeed hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAdminFeed is defined', () => {
    expect(useAdminFeed).toBeDefined();
  });

  it('useAdminFeedItem is defined', () => {
    expect(useAdminFeedItem).toBeDefined();
  });

  it('useCreateFeedItem is defined', () => {
    expect(useCreateFeedItem).toBeDefined();
  });

  it('useUpdateFeedItem is defined', () => {
    expect(useUpdateFeedItem).toBeDefined();
  });

  it('useDeleteFeedItem is defined', () => {
    expect(useDeleteFeedItem).toBeDefined();
  });

  it('useTogglePinFeed is defined', () => {
    expect(useTogglePinFeed).toBeDefined();
  });

  it('useToggleFeatureFeed is defined', () => {
    expect(useToggleFeatureFeed).toBeDefined();
  });

  it('useReorderFeed is defined', () => {
    expect(useReorderFeed).toBeDefined();
  });
});
